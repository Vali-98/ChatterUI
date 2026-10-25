import type { db } from './db'

export type CharInfo = {
    name: string
    id: number
    image_id: number
    last_modified: number
    tags: string[]
    links: {
        id: number
        type: 'user_id' | 'instruct_id' | 'connection_id' | 'sampler_id' | 'model_id'
        character_id: number
        value: number
    }[]
    latestSwipe?: string
    latestName?: string
    latestChat?: number
}

export type CharacterTokenCache = {
    otherName: string
    description_length: number
    examples_length: number
    personality_length: number
    scenario_length: number
}

export type CharacterCardState = {
    card?: CharacterCardData
    id: number | undefined
    updateCard: (card: CharacterCardData) => void
    setCard: (id: number) => Promise<string | undefined>
    unloadCard: () => void
    getImage: () => string
}

export type CharacterCardData = Awaited<ReturnType<typeof db.query.cardQuery>>
