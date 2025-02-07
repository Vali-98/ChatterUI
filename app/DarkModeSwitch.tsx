import ThemedSwitch from '@components/input/ThemedSwitch'
import { DefaultColorSchemes } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'

const DarkModeSwitch = () => {
    const { color, setColor } = Theme.useColorState((state) => ({
        color: state.color,
        setColor: state.setColor,
    }))

    return (
        <ThemedSwitch
            label="Dark Mode"
            value={color.name === DefaultColorSchemes.lavenderDark.name}
            onChangeValue={(b) =>
                setColor(b ? DefaultColorSchemes.lavenderDark : DefaultColorSchemes.lavenderLight)
            }
        />
    )
}

export default DarkModeSwitch
