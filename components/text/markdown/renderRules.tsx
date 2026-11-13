import type { RenderContext, RenderRules } from '@vali98/react-native-markdown-display'

import MarkdownCodeBlock from './MarkdownCodeBlock'
import MarkdownImage from './MarkdownImage'
import MarkdownMath from './MarkdownMath'

// The native tree stores code and maths in child nodes, including highlighted code segments.
const nodeText = ({ node, block }: RenderContext) =>
    node.content ||
    (block?.nodes
        .filter((child) => child.id.startsWith(`${node.id}/`))
        .map((child) => child.content)
        .join('') ??
        '')

export const markdownRules: RenderRules = {
    fence: (context) => (
        <MarkdownCodeBlock
            content={nodeText(context)}
            language={context.node.language}
            headerStyle={context.styles.fenceHeader}
            textStyle={[
                {
                    color: context.styles.body.color,
                    fontSize: context.styles.paragraph.fontSize,
                    fontWeight: context.styles.paragraph.fontWeight,
                },
                context.styles.fence,
            ]}
        />
    ),
    latex_block: (context) => (
        <MarkdownMath {...context.styles.latex_block} latex={nodeText(context)} displayMode />
    ),
    latex_inline: (context) => (
        <MarkdownMath
            {...context.styles.latex_inline}
            latex={nodeText(context)}
            displayMode={false}
        />
    ),
    image: (context) => (
        <MarkdownImage
            source={context.node.destination}
            alt={nodeText(context)}
            style={context.styles.image}
        />
    ),
}
