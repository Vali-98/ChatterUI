import { RaTeXView } from 'ratex-react-native'
import React from 'react'
import type { ColorValue, ViewStyle } from 'react-native'

// Pass style fields individually: Markdown recreates style objects while streaming, but these
// values stay equal until the formula or its appearance changes.
const MarkdownMath = React.memo(
    ({ latex, ...style }: ViewStyle & { latex: string; color?: ColorValue; fontSize?: number }) => (
        <RaTeXView latex={latex} style={style} color={style.color} />
    )
)

export default MarkdownMath
