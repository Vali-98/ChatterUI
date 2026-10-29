// Theme fills are opaque #RGB or #RRGGBB colours.
export const getLuminance = (background: string): number => {
    const hex = background.slice(1)
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
    const channels = [0, 2, 4].map((offset) => {
        const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export const getContrastRatio = (foreground: string, background: string): number => {
    const first = getLuminance(foreground)
    const second = getLuminance(background)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export const getContrastingColor = (background: string): '#000000' | '#ffffff' => {
    const luminance = getLuminance(background)
    const blackContrast = (luminance + 0.05) / 0.05
    const whiteContrast = 1.05 / (luminance + 0.05)
    return blackContrast >= whiteContrast ? '#000000' : '#ffffff'
}

export const getShadowColor = (shadow: { color: string; opacity: number }): string => {
    const hex = shadow.color.slice(1)
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
    return (
        '#' +
        expanded +
        Math.round(shadow.opacity * 255)
            .toString(16)
            .padStart(2, '0')
    )
}
