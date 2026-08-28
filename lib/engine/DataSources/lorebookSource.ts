import { addDatabaseChangeListener } from 'expo-sqlite'
import { create } from 'zustand'

import { LorebookEntryType, LorebookType } from '@db/schema'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Lorebooks } from '@lib/state/lorebooks'
import { useLorebookPreferenceStore } from '@lib/state/lorebooks/state'
import { replaceMacros } from '@lib/state/Macros'

import { DataSource, DataSourceResult } from './types'
import type { ContextMessage } from '../API/ContextBuilder'

type LorebookEntryRegexCache = {
    cache: Record<number, RegExp>
    get: (entry: LorebookEntryType, type: 'primary' | 'secondary') => RegExp
    remove: (id: number) => void
}

const lorebookEntryRegexCache = create<LorebookEntryRegexCache>()((set, get) => ({
    cache: {},
    get: (entry, type) => {
        const cacheId = entry.id * 2 + (type === 'secondary' ? 1 : 0)
        const cached = get().cache[cacheId]

        if (cached) return cached

        const regex = createKeyRegex(
            type === 'primary' ? entry.keys : entry.secondary_keys,
            entry.case_sensitive
        )

        set((state) => ({
            cache: {
                ...state.cache,
                [cacheId]: regex,
            },
        }))

        return regex
    },

    remove: (id) => {
        const { [id * 2]: primary, [id * 2 + 1]: secondary, ...rest } = get().cache

        if (primary || secondary) {
            set({ cache: rest })
        }
    },
}))

const createKeyRegex = (keys: string[], caseSensitive: boolean): RegExp => {
    const escapedKeys = keys
        .filter(Boolean)
        .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    // Never-match regex if there are no valid keys.
    if (escapedKeys.length === 0) {
        return /(?!)/
    }

    const flags = caseSensitive ? 'u' : 'iu'

    return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${escapedKeys.join('|')})(?![\\p{L}\\p{N}_])`, flags)
}

addDatabaseChangeListener((event) => {
    if (event.databaseName !== 'db.db' || event.tableName !== 'lorebook_entries') return
    lorebookEntryRegexCache.getState().remove(event.rowId)
})

const LOREBOOK_NAME = 'lorebook'

type MatchedEntry = {
    entry: NonNullable<LorebookEntryType>
    content: string
    tokenLength: number
    discoveryOrder: number
}

const matchesEntry = (entry: LorebookEntryType, text: string): boolean => {
    if (entry.constant) return true

    const primaryRegex = lorebookEntryRegexCache.getState().get(entry, 'primary')

    if (!primaryRegex.test(text)) return false

    if (!entry.selective) return true

    const secondaryRegex = lorebookEntryRegexCache.getState().get(entry, 'secondary')

    return secondaryRegex.test(text)
}

/**
 * Creates the text that participates in the initial lorebook scan.
 *
 * scan_depth is interpreted as the number of most recent messages
 * participating in matching.
 */
const getScanText = (messages: ContextMessage[], scanDepth: number): string => {
    if (scanDepth <= 0) return messages.map((item) => item.content).join('\n')

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
    lorebook: LorebookType
): Promise<DataSource | undefined> => {
    const entries = await Lorebooks.db.query.lorebookEntryList(lorebook.id)

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

            const configuredBudget = lorebook.token_budget ?? 0

            if (configuredBudget <= 0) return []

            const availableBudget = Math.min(configuredBudget, maxLength - currentLength)

            if (availableBudget <= 0) return []

            /*
             * Initial scan.
             */
            const initialText = getScanText(messages, lorebook.scan_depth ?? 1)

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
            if (lorebook.recursive_scanning) {
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

            const { insertionLocation, insertionDepth } = useLorebookPreferenceStore.getState()
            const position: DataSourceResult['position'] =
                insertionLocation === 'index'
                    ? {
                          type: 'index',
                          location: insertionDepth,
                      }
                    : {
                          type: 'relative',
                          location: insertionLocation,
                      }

            return selected.map((matched) => ({
                content: `**${matched.entry.name}**: ` + matched.content,
                source: `${LOREBOOK_NAME}:${lorebook.id}:${matched.entry.id}`,
                tokenLength: matched.tokenLength,
                position: position,
            }))
        },
    }
}

export default createLorebookDataSource
