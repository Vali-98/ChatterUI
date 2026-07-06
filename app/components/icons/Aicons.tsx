/* eslint-disable i18next/no-literal-string */
import { createIconSet } from '@react-native-vector-icons/common'
const glyphMap = {
    ollama: 0xf000,
    claude: 0xf001,
    cohere: 0xf002,
    openrouter: 0xf003,
    openai: 0xf004,
    lightning: 0xf005,
    googleai: 0xf006,
    link: 0xf007,
    gear: 0xf008,
}

const Aicons = createIconSet(glyphMap, {
    postScriptName: 'Aicons',
    fontFileName: 'Aicons.ttf',
    fontSource: require('@assets/icons/Aicons.ttf'),
})

export type AiconsGlyphName = keyof typeof glyphMap

export default Aicons
