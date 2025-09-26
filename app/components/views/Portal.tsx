import { ReactNode, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { create } from 'zustand'

type PortalItem = {
    key: string
    children: ReactNode
}

type PortalState = {
    portals: PortalItem[]
    mount: (key: string, children: ReactNode) => void
    update: (key: string, children: ReactNode) => void
    unmount: (key: string) => void
}

const usePortalStore = create<PortalState>((set) => ({
    portals: [],
    mount: (key, children) =>
        set((state) => {
            // avoid duplicates
            if (state.portals.find((p) => p.key === key)) {
                return {
                    portals: state.portals.map((p) => (p.key === key ? { key, children } : p)),
                }
            }
            return { portals: [...state.portals, { key, children }] }
        }),
    update: (key, children) =>
        set((state) => ({
            portals: state.portals.map((p) => (p.key === key ? { key, children } : p)),
        })),
    unmount: (key) =>
        set((state) => ({
            portals: state.portals.filter((p) => p.key !== key),
        })),
}))

export const PortalHost = () => {
    const portals = usePortalStore((s) => s.portals)

    if (portals.length === 0) return null

    return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {portals.map((p) => (
                <View
                    key={p.key}
                    style={[
                        StyleSheet.absoluteFill,
                        { justifyContent: 'center', alignItems: 'center' },
                    ]}
                    pointerEvents="box-none">
                    {p.children}
                </View>
            ))}
        </View>
    )
}

type PortalProps = {
    children: ReactNode
    name: string // unique key
}

const Portal = ({ children, name }: PortalProps) => {
    const { mount, update, unmount } = usePortalStore()

    useEffect(() => {
        mount(name, children)
        return () => {
            unmount(name)
        }
    }, [name])

    useEffect(() => {
        update(name, children)
    }, [children])

    return null
}

export default Portal
