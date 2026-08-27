import { LorebookEntryType } from '@db/schema'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Lorebooks } from '@lib/state/lorebooks'
import { replaceMacros } from '@lib/state/Macros'

import type { ContextBuilderParams, ContextMessage } from '../API/ContextBuilder'

export type DataSourceResult = {
    content: string
    source: string
    tokenLength: number
    position:
        | {
              type: 'relative'
              location: 'afterLast' | 'beforeLast' | 'afterSystem'
          }
        | {
              type: 'index'
              location: number
          }
}

export type DataSource = {
    retrieve: (
        params: ContextBuilderParams,
        messages: ContextMessage[],
        maxLength: number,
        currentLength: number,
        tokenBudget: number,
        lastMessageReached: boolean
    ) => Promise<DataSourceResult[]>
    tokenBudget: number
    priority: number
    name: string
}

const LOREBOOK_NAME = 'lorebook'

type LorebookConfig = {
    scan_depth: number
    token_budget: number
    recursive_scanning: boolean
}

type MatchedEntry = {
    entry: NonNullable<LorebookEntryType>
    content: string
    tokenLength: number
    discoveryOrder: number
}

/**
 * Lorebook matching is deliberately done in JS rather than SQLite.
 *
 * A typical lorebook is small enough that scanning:
 *
 *     500 entries × 3 keys
 *
 * is trivial compared to the rest of generation.
 */
const containsKey = (text: string, key: string, caseSensitive: boolean): boolean => {
    if (!key) return false

    if (caseSensitive) {
        return text.includes(key)
    }

    return text.toLocaleLowerCase().includes(key.toLocaleLowerCase())
}

const matchesAnyKey = (text: string, keys: string[], caseSensitive: boolean): boolean => {
    return keys.some((key) => containsKey(text, key, caseSensitive))
}

const matchesEntry = (entry: NonNullable<LorebookEntryType>, text: string): boolean => {
    if (entry.constant) return true

    const caseSensitive = entry.case_sensitive

    const primaryMatch = matchesAnyKey(text, entry.keys, caseSensitive)

    if (!primaryMatch) return false

    if (!entry.selective) return true

    return matchesAnyKey(text, entry.secondary_keys, caseSensitive)
}

/**
 * Creates the text that participates in the initial lorebook scan.
 *
 * scan_depth is interpreted as the number of most recent messages
 * participating in matching.
 */
const getScanText = (messages: ContextMessage[], scanDepth: number): string => {
    if (scanDepth <= 0) return ''

    return messages
        .slice(-scanDepth)
        .map((message) => message.content)
        .join('\n')
}

/**
 * Entries are ordered so that higher priority entries get the first
 * opportunity to consume the token budget.
 *
 * Within the same priority, lower insertion_order comes first.
 *
 * discoveryOrder is only a final deterministic tie-breaker.
 */
const sortEntries = (entries: MatchedEntry[]) => {
    return entries.sort((a, b) => {
        if (a.entry.priority !== b.entry.priority) {
            return b.entry.priority - a.entry.priority
        }

        if (a.entry.insertion_order !== b.entry.insertion_order) {
            return a.entry.insertion_order - b.entry.insertion_order
        }

        return a.discoveryOrder - b.discoveryOrder
    })
}

const createLorebookDataSource = async (
    lorebookId: number,
    config: LorebookConfig
): Promise<DataSource | undefined> => {
    const entries = await Lorebooks.db.query.lorebookEntryList(lorebookId)

    const enabledEntries = entries.filter((entry) => entry.enable)

    if (enabledEntries.length === 0) return

    const tokenizer = Tokenizer.getTokenizer()

    /*
     * tokenLengths is kept outside retrieve() so repeated generations
     * don't have to tokenize unchanged lorebook content.
     *
     * This is particularly useful because token budget enforcement
     * requires knowing the token count.
     */
    const tokenLengths = new Map<number, number>()

    const getTokenLength = async (entry: NonNullable<LorebookEntryType>): Promise<number> => {
        const cached = tokenLengths.get(entry.id)

        if (cached !== undefined) {
            return cached
        }

        const tokenLength = await tokenizer(entry.content)

        tokenLengths.set(entry.id, tokenLength)

        return tokenLength
    }

    return {
        name: LOREBOOK_NAME,
        priority: 2,

        /*
         * Do not reserve the entire lorebook budget.

         The lorebook is opportunistic: if it only needs 150 tokens,
         the remaining context capacity remains available to other
         datasources.
         */
        tokenBudget: 0,

        retrieve: async (
            params,
            messages,
            maxLength,
            currentLength,
            _tokenBudget,
            lastMessageReached
        ) => {
            if (!lastMessageReached) return []

            const configuredBudget = config.token_budget

            if (configuredBudget <= 0) return []

            const availableBudget = Math.min(configuredBudget, maxLength - currentLength)

            if (availableBudget <= 0) return []

            /*
             * Initial scan.
             */
            const initialText = getScanText(messages, config.scan_depth)

            if (!initialText && !enabledEntries.some((entry) => entry.constant)) {
                return []
            }

            /*
             * We keep matched IDs in a Set because recursive scanning
             * can encounter the same entry multiple times.
             */
            const matchedIds = new Set<number>()

            const matchedEntries: MatchedEntry[] = []

            let discoveryOrder = 0

            const addEntry = async (entry: NonNullable<LorebookEntryType>) => {
                if (matchedIds.has(entry.id)) return

                matchedIds.add(entry.id)

                matchedEntries.push({
                    entry: entry,
                    content: replaceMacros(entry.content),
                    tokenLength: await getTokenLength(entry),
                    discoveryOrder: discoveryOrder++,
                })
            }

            /*
             * Entries are discovered in database order here.
             * The final output ordering is handled separately.
             */
            for (const entry of enabledEntries) {
                if (matchesEntry(entry, initialText)) {
                    await addEntry(entry)
                }
            }

            /*
             * Recursive scanning.
             *
             * Each newly matched entry's CONTENT becomes searchable.
             *
             * We deliberately use rounds rather than recursively calling
             * ourselves so cycles such as:
             *
             *     A -> B -> A
             *
             * are harmless.
             */
            if (config.recursive_scanning) {
                let scanIndex = 0

                while (scanIndex < matchedEntries.length) {
                    const current = matchedEntries[scanIndex++]

                    for (const candidate of enabledEntries) {
                        if (matchedIds.has(candidate.id)) continue

                        if (matchesEntry(candidate, current.content)) {
                            await addEntry(candidate)
                        }
                    }
                }
            }

            if (matchedEntries.length === 0) {
                return []
            }

            /*
             * Priority determines which entries survive the token budget.
             * insertion_order determines prompt ordering afterward.
             */
            sortEntries(matchedEntries)

            const selected: MatchedEntry[] = []
            let usedTokens = 0

            for (const matched of matchedEntries) {
                if (usedTokens + matched.tokenLength > availableBudget) {
                    continue
                }

                selected.push(matched)
                usedTokens += matched.tokenLength
            }

            /*
             * Prompt ordering is independent from priority.
             *
             * Lower insertion_order = inserted higher.
             */
            selected.sort((a, b) => {
                if (a.entry.insertion_order !== b.entry.insertion_order) {
                    return a.entry.insertion_order - b.entry.insertion_order
                }

                return a.discoveryOrder - b.discoveryOrder
            })

            return selected.map((matched) => ({
                content: `**${matched.entry.name}**: ` + matched.content,
                source: `${LOREBOOK_NAME}:${lorebookId}:${matched.entry.id}`,
                tokenLength: matched.tokenLength,
                position: {
                    type: 'relative',
                    location: 'afterSystem',
                },
            }))
        },
    }
}

export default createLorebookDataSource
