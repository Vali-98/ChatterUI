import type { characters } from '@db/schema'

import type { CharacterCardQuery } from './db'

export type CharacterCardType = 'character' | 'user'
export type CharacterSortBy = 'name' | 'modified'
export type CharacterSortDirection = 'asc' | 'desc'

export type CharacterCard = NonNullable<Awaited<CharacterCardQuery>>

export type CharacterCardSummary = {
    name: string
    id: number
    image_id: number
    last_modified: number
    tags: string[]
    links: CharacterCard['links']
    latestSwipeText?: string
    latestMessageName?: string
    latestChatId?: number
}

export type CharacterCardListOptions = {
    type?: CharacterCardType
    sortBy?: 'id' | 'modified'
}

export type CharacterCardListPageOptions = {
    type?: CharacterCardType
    sortBy?: CharacterSortBy
    sortDirection?: CharacterSortDirection
    limit?: number
    offset?: number
    searchText?: string
    includedTags?: string[]
    hiddenTags?: string[]
}

export type CreateCardDatabaseOptions = Partial<
    Pick<typeof characters.$inferInsert, 'type' | 'image_id'>
>
export type CreateCardOptions = {
    type?: CharacterCardType
    imageUri?: string
}
export type CharacterCardChanges = Partial<Omit<typeof characters.$inferInsert, 'id'>>

export type CharacterTokenCounts = {
    otherParticipantName: string
    descriptionTokens: number
    exampleTokens: number
    personalityTokens: number
    scenarioTokens: number
}

export type CharacterCardSelectionState = {
    card?: CharacterCard
    id: number | undefined
    error?: Error
    setCard: (characterId: number) => string | undefined
    unloadCard: () => void
    getImageUri: () => string
}
