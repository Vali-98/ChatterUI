export type KeysOfType<A, B> = {
    [K in keyof A]-?: A[K] extends B ? K : never
}[keyof A]
