// Theme fills are opaque #RGB or #RRGGBB colours.
export const getContrastingColor = (background: string): '#000000' | '#ffffff' => {
    const hex = background.slice(1)
    const expanded = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
    const channels = [0, 2, 4].map((offset) => {
        const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    const blackContrast = (luminance + 0.05) / 0.05
    const whiteContrast = 1.05 / (luminance + 0.05)
    return blackContrast >= whiteContrast ? '#000000' : '#ffffff'
}
