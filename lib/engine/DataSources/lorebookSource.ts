import { addDatabaseChangeListener } from 'expo-sqlite'

import { LorebookEntryType, LorebookType } from '@db/schema'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Lorebooks } from '@lib/state/lorebooks'
import { useLorebookPreferenceStore } from '@lib/state/lorebooks/state'
import { replaceMacros } from '@lib/state/Macros'

import { DataSource, DataSourceResult } from './types'
import type { ContextMessage } from '../API/ContextBuilder'

const MAX_CACHE_LIFETIME = 5

type LorebookEntryCacheItem = {
    primaryKey: RegExp
    secondaryKey: RegExp
    tokenCount: number
    searchTime: number
}

class LorebookEntryCache {
    private readonly cache = new Map<number, LorebookEntryCacheItem>()
    private lifetime = 0

    async get(entry: LorebookEntryType): Promise<LorebookEntryCacheItem> {
        const cached = this.cache.get(entry.id)

        if (cached) {
            cached.searchTime = this.lifetime
            return cached
        }

        const item: LorebookEntryCacheItem = {
            primaryKey: createKeyRegex(entry.keys, entry.case_sensitive),
            secondaryKey: createKeyRegex(entry.secondary_keys, entry.case_sensitive),
            tokenCount: await Tokenizer.getTokenizer()(entry.content),
            searchTime: this.lifetime,
        }

        this.cache.set(entry.id, item)

        return item
    }

    remove(id: number): void {
        this.cache.delete(id)
    }

    collect(): void {
        const cutoff = this.lifetime - MAX_CACHE_LIFETIME

        for (const [id, item] of this.cache) {
            if (item.searchTime < cutoff) {
                this.cache.delete(id)
            }
        }

        this.lifetime++
    }
}

const lorebookEntryCache = new LorebookEntryCache()

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
    lorebookEntryCache.remove(event.rowId)
})

const LOREBOOK_NAME = 'lorebook'

type MatchedEntry = {
    entry: NonNullable<LorebookEntryType>
    content: string
    tokenLength: number
    discoveryOrder: number
}

const matchesEntry = async (entry: LorebookEntryType, text: string): Promise<boolean> => {
    if (entry.constant) return true
    const cachedEntry = await lorebookEntryCache.get(entry)

    if (!cachedEntry.primaryKey.test(text)) return false

    if (!entry.selective) return true

    return cachedEntry.secondaryKey.test(text)
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
    entries.sort((a, b) => {
        if (a.entry.priority !== b.entry.priority) {
            return b.entry.priority - a.entry.priority
        }

        if (a.entry.insertion_order !== b.entry.insertion_order) {
            return b.entry.insertion_order - a.entry.insertion_order
        }

        return a.discoveryOrder - b.discoveryOrder
    })
}

const getSingleLorebookSource = async (lorebook: LorebookType): Promise<DataSource | undefined> => {
    const entries = await Lorebooks.db.query.lorebookEntryList(lorebook.id)

    const enabledEntries = entries.filter((entry) => entry.enable)

    if (enabledEntries.length === 0) return

    const getTokenLength = async (entry: NonNullable<LorebookEntryType>): Promise<number> => {
        const cached = (await lorebookEntryCache.get(entry)).tokenCount
        return cached
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
                if (await matchesEntry(entry, initialText)) {
                    await addEntry(entry)
                }
            }

            if (lorebook.recursive_scanning && matchedEntries.length > 0) {
                const initialMatches = [...matchedEntries]

                const recursiveText = initialMatches.map((matched) => matched.content).join('\n')

                for (const candidate of enabledEntries) {
                    if (matchedIds.has(candidate.id)) continue

                    if (await matchesEntry(candidate, recursiveText)) {
                        await addEntry({
                            ...candidate,
                            priority: candidate.priority + 10000,
                            insertion_order: candidate.insertion_order + 10000,
                        })
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

            sortEntries(selected)

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

const createLorebookDataSource = async () => {
    lorebookEntryCache.collect()

    const output: DataSource[] = []
    const lorebooks = await Lorebooks.db.query.activeLorebooks()

    for (const lorebook of lorebooks) {
        const lorebookSource = await getSingleLorebookSource(lorebook)
        if (lorebookSource) {
            output.push(lorebookSource)
        }
    }
    return output
}

export default createLorebookDataSource
