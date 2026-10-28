import type { SpotlightPlacementOptions } from './placement'

export type GuideContext = {
    origin: 'fresh' | 'legacy' | undefined
    onboardingComplete: boolean
}

export type GuideStep = {
    id: string
    target?: string
    description: string
} & SpotlightPlacementOptions

type GuideDefinition = {
    audience: 'newUsers' | 'allUsers'
    isEligible?: (context: GuideContext) => boolean
    steps: readonly GuideStep[]
}

export const guides = {
    'main-ui': {
        audience: 'newUsers',
        steps: [
            { id: 'welcome', description: 'guides.main.welcome' },
            {
                id: 'characters',
                target: 'main.characters',
                description: 'guides.main.characters',
                placement: 'bottom',
                allowOverlap: true,
            },
            { id: 'import', target: 'main.import', description: 'guides.main.import' },
            { id: 'menu', target: 'main.menu', description: 'guides.main.menu' },
        ],
    },
    'chat-ui': {
        audience: 'newUsers',
        steps: [
            { id: 'history', target: 'chat.history', description: 'guides.chat.history' },
            {
                id: 'options',
                target: 'chat.options',
                description: 'guides.chat.options',
                placement: 'top',
            },
        ],
    },
    'main-drawer': {
        audience: 'newUsers',
        steps: [
            { id: 'persona', target: 'drawer.persona', description: 'guides.drawer.persona' },
            { id: 'options', target: 'drawer.options', description: 'guides.drawer.options' },
        ],
    },
} as const satisfies Record<string, GuideDefinition>

export type GuideId = keyof typeof guides
type TargetOf<T> = T extends { target: infer Target extends string } ? Target : never
export type GuideTargetId = TargetOf<(typeof guides)[GuideId]['steps'][number]>

export const isGuideEligible = (id: GuideId, context: GuideContext) => {
    const guide: GuideDefinition = guides[id]
    if (!context.onboardingComplete) return false
    if (guide.audience === 'newUsers' && context.origin !== 'fresh') return false
    return guide.isEligible?.(context) ?? true
}

export const onboardingGuideIds: GuideId[] = ['main-ui', 'chat-ui', 'main-drawer']
