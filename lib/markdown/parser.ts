import { MarkdownIt } from 'react-native-markdown-display'

import latexPlugin from './plugins/latexPlugin'
import quotePlugin from './plugins/quotePlugin'

export const markdownParser = MarkdownIt({ typographer: true }).use(quotePlugin).use(latexPlugin)
