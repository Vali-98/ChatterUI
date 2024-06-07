import { StyleSheet } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { AppSettings } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv, mmkvStorage } from './mmkv'

type HSL = { h: number; s: number; l: number }

type ColorTypes = {
    primary: HSL
    warning: HSL
    destructive: HSL
    confirm: HSL
}

type ColorScheme = 'light' | 'dark'

type ColorTypeName = 'primary' | 'warning' | 'destructive' | 'confirm'

type ColorComponent =
    | 'brand'
    | 'text1'
    | 'text2'
    | 'text3'
    | 'surface1'
    | 'surface2'
    | 'surface3'
    | 'surface4'
    | 'shadow'

export type ColorId =
    | `${ColorTypeName}-${ColorComponent}-${ColorScheme}`
    | `${ColorTypeName}-${ColorComponent}`

type ColorIdObject = {
    name: ColorTypeName
    component: ColorComponent
    scheme: ColorScheme | undefined
}

const destructColorID = (id: ColorId): ColorIdObject => {
    const data = id.split(`-`)
    let [name, component, scheme]: [
        ColorTypeName | undefined,
        ColorComponent | undefined,
        ColorScheme | undefined,
    ] = [undefined, undefined, undefined]
    if (id.length === 2) [name, component] = data as [ColorTypeName, ColorComponent]
    else [name, component, scheme] = data as [ColorTypeName, ColorComponent, ColorScheme]
    return {
        name: name,
        component: component,
        scheme: scheme,
    }
}

const getHSLString = (h: number, s: number, l: number) => {
    return `hsl(${h} ${s}% ${l}%)`
}

const createColor = (
    hsl: HSL,
    component: ColorComponent,
    scheme: ColorScheme | undefined
): string => {
    const darkMode = scheme ? scheme === 'dark' : Style.useColorScheme.getState().darkMode
    const { h, s, l } = hsl
    if (!darkMode)
        switch (component) {
            case 'brand':
                return getHSLString(h, s, l)
            case 'text1':
                return getHSLString(h, s, 35)
            case 'text2':
                return getHSLString(h, 30, 30)
            case 'text3':
                return getHSLString(h, 2, 30)
            case 'surface1':
                return getHSLString(h, 25, 82)
            case 'surface2':
                return getHSLString(h, 30, 85)
            case 'surface3':
                return getHSLString(h, 20, 85)
            case 'surface4':
                return getHSLString(h, 14, 25)
            case 'shadow':
                return getHSLString(h, 10, l / 5)
        }

    switch (component) {
        case 'brand':
            return getHSLString(h, s / 1.5, l / 1.5)
        case 'text1':
            return getHSLString(h, 10, 85)
        case 'text2':
            return getHSLString(h, 5, 60)
        case 'text3':
            return getHSLString(h, 2, 30)
        case 'surface1':
            return getHSLString(h, 8, 9)
        case 'surface2':
            return getHSLString(h, 10, 12)
        case 'surface3':
            return getHSLString(h, 12, 20)
        case 'surface4':
            return getHSLString(h, 14, 25)
        case 'shadow':
            return getHSLString(h, 50, 1)
    }

    Logger.debug('WARNING: COLOR NOT FOUND')
    return 'red'
}

const getColorFromKV = () => {
    const primary = mmkv.getNumber(AppSettings.PrimaryHue)
    if (!primary) {
        mmkv.set(AppSettings.PrimaryHue, 270)
        return 270
    }
    return primary
}

const getDarkModeFromKV = () => {
    const darkMode = mmkv.getBoolean(AppSettings.DarkMode)
    if (!darkMode) {
        mmkv.set(AppSettings.DarkMode, true)
        return true
    }
    return darkMode
}

export namespace Style {
    type ColorState = {
        colors: ColorTypes
        setColor: (colors: ColorTypes) => void
        getColor: (id: ColorId) => string
        darkMode: boolean
        toggleDarkMode: () => void
        setPrimary: (h: number, s: number, l: number) => void
    }

    export const getColor = (id: ColorId) => {
        return useColorScheme.getState().getColor(id)
    }

    export const useColorScheme = create<ColorState>()(
        persist(
            (set, get) => ({
                darkMode: true,
                colors: {
                    primary: {
                        h: 260,
                        s: 26,
                        l: 73,
                    },
                    accent: { h: 180, s: 80, l: 50 },
                    warning: { h: 50, s: 60, l: 50 },
                    destructive: { h: 5, s: 60, l: 50 },
                    confirm: { h: 140, s: 60, l: 50 },
                },
                setColor: (colors: ColorTypes) => set((state) => ({ ...state, colors: colors })),
                getColor: (id: ColorId): string => {
                    const { name, component, scheme } = destructColorID(id)

                    return createColor(get().colors[name], component, scheme)
                },
                toggleDarkMode: () => {
                    const newMode = !get().darkMode
                    mmkv.set(AppSettings.DarkMode, newMode)
                    set((state) => ({ ...state, darkMode: newMode }))
                },
                setPrimary: (h: number, s: number, l: number) => {
                    mmkv.set(AppSettings.PrimaryHue, h)
                    set((state) => ({
                        ...state,
                        colors: { ...state.colors, primary: { h, s, l } },
                    }))
                },
            }),
            { name: 'color-storage', storage: createJSONStorage(() => mmkvStorage) }
        )
    )

    export const defaultBrandColor = { h: 270, s: 26, l: 73 }

    export const drawer = {
        default: {
            placeholderStyle: { color: Style.getColor('primary-text2') },
            containerStyle: {
                backgroundColor: Style.getColor('primary-surface2'),
                borderWidth: 0,
                shadowColor: Style.getColor('primary-shadow'),
                elevation: 4,
            },
            itemContainerStyle: {
                backgroundColor: Style.getColor('primary-surface2'),
            },
            itemTextStyle: {
                color: Style.getColor('primary-text1'),
                borderColor: Style.getColor('primary-surface1'),
            },
            activeColor: Style.getColor('primary-surface4'),
            selectedTextStyle: {
                color: Style.getColor('primary-text1'),
            },
            style: {
                backgroundColor: Style.getColor('primary-surface3'),
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginVertical: 8,
                borderRadius: 8,
                flex: 1,
            },
            showsVerticalScrollIndicator: false,
        },
    }

    export const view = StyleSheet.create({
        mainContainer: {
            paddingVertical: 16,
            paddingHorizontal: 16,
            flex: 1,
        },

        headerButtonRight: {
            marginLeft: 20,
            marginRight: 4,
        },

        headerButtonLeft: {
            marginRight: 20,
            padding: 2,
        },

        buttonLarge: {
            borderRadius: 8,
            minWidth: 42,
            minHeight: 42,
            backgroundColor: Style.getColor('primary-brand'),
            padding: 6,
        },

        row: {
            flexDirection: 'row',
        },
    })
}
