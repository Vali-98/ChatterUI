import { Text } from 'react-native'
import type { ASTNode, RenderRules } from 'react-native-markdown-display'

import MarkdownCodeBlock from './MarkdownCodeBlock'
import MarkdownImage from './MarkdownImage'
import MarkdownMath from './MarkdownMath'
import MarkdownQuote from './MarkdownQuote'
import MarkdownTextGroup from './MarkdownTextGroup'

export const markdownRules: RenderRules = {
    fence: (
        node: ASTNode & { sourceInfo?: string },
        children,
        parent,
        styles,
        inheritedStyles = {}
    ) => (
        <MarkdownCodeBlock
            key={node.key}
            content={node.content}
            language={node.sourceInfo}
            headerStyle={styles.fenceHeader}
            textStyle={[inheritedStyles, styles.fence]}
        />
    ),
    double_quote: (node, children, parent, styles) => (
        <MarkdownQuote key={node.key} node={node} style={styles.double_quote}>
            {children}
        </MarkdownQuote>
    ),
    latex_block: (node, children, parent, styles) => (
        <MarkdownMath {...styles.latex_block} latex={node.content ?? ''} key={node.key} />
    ),
    latex_inline: (node, children, parent, styles) => (
        <MarkdownMath {...styles.latex_inline} latex={node.content ?? ''} key={node.key} />
    ),
    textgroup: (node, children, parent, styles) => (
        <MarkdownTextGroup key={node.key} node={node} style={styles.textgroup}>
            {children}
        </MarkdownTextGroup>
    ),
    inline: (node, children, parent, styles) => (
        <Text key={node.key} style={[styles.inline, { flexWrap: 'wrap', width: '100%' }]}>
            {children}
        </Text>
    ),
    image: (node, children, parent, styles, allowedImageHandlers, defaultImageHandler) => (
        <MarkdownImage
            key={node.key}
            node={node}
            style={styles._VIEW_SAFE_image}
            allowedImageHandlers={allowedImageHandlers}
            defaultImageHandler={defaultImageHandler}
        />
    ),
}
