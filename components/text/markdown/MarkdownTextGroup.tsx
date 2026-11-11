import React, { type ReactNode } from 'react'
import { Text, View, type StyleProp, type TextStyle } from 'react-native'
import type { ASTNode } from 'react-native-markdown-display'

const getDeepASTDirection = (astNode: ASTNode | undefined): 'ltr' | 'rtl' | 'neutral' => {
    if (!astNode) return 'neutral'

    // Explicitly flag softbreaks or hardbreaks as neutral
    if (
        astNode.type === 'softbreak' ||
        astNode.type === 'hardbreak' ||
        astNode.type === 'double_quote'
    ) {
        return 'neutral'
    }

    if (astNode.type === 'text' && typeof astNode.content === 'string') {
        // If it's pure whitespace/newlines, it's neutral
        if (!astNode.content.trim()) return 'neutral'

        const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
        return rtlRegex.test(astNode.content) ? 'rtl' : 'ltr'
    }

    if (Array.isArray(astNode.children)) {
        for (const childNode of astNode.children) {
            const dir = getDeepASTDirection(childNode)
            if (dir !== 'neutral') return dir // Return the first concrete direction found
        }
    }

    return 'neutral'
}

const MarkdownTextGroup = ({
    node,
    children,
    style,
}: {
    node: ASTNode
    children: ReactNode
    style: StyleProp<TextStyle>
}) => {
    const astChildrenArray = node.children || []
    const renderedChildrenArray = React.Children.toArray(children)

    const componentRuns: { direction: 'ltr' | 'rtl'; renderedChildren: ReactNode[] }[] = []
    let currentRunRendered: ReactNode[] = []

    // Start with a fallback default, but it will update on the first non-neutral node
    let currentDir: 'ltr' | 'rtl' = 'ltr'
    let isFirstNode = true
    astChildrenArray.forEach((astChild, index) => {
        const renderedChild = renderedChildrenArray[index]
        if (!renderedChild) return

        let childDir = getDeepASTDirection(astChild)

        // If the node is neutral (like a softbreak), force it to adopt the current running direction
        if (childDir === 'neutral') {
            childDir = currentDir
        }

        if (isFirstNode) {
            currentDir = childDir
            isFirstNode = false
            currentRunRendered.push(renderedChild)
        } else if (childDir === currentDir) {
            currentRunRendered.push(renderedChild)
        } else {
            // A genuine direction switch happened (LTR <-> RTL)
            componentRuns.push({
                direction: currentDir,
                renderedChildren: currentRunRendered,
            })
            currentDir = childDir
            currentRunRendered = [renderedChild]
        }
    })

    if (currentRunRendered.length > 0) {
        componentRuns.push({
            direction: currentDir,
            renderedChildren: currentRunRendered,
        })
    }

    return (
        <View key={node.key} style={{ width: '100%', flexWrap: 'wrap' }}>
            {componentRuns.map((run, index) => {
                const isRtl = run.direction === 'rtl'

                return (
                    <Text
                        key={`run-${index}`}
                        style={[
                            style,
                            {
                                flexWrap: 'wrap',
                                width: '100%',
                                writingDirection: run.direction,
                                textAlign: isRtl ? 'right' : 'left',
                            },
                        ]}>
                        {isRtl ? '\u2067' : '\u2066'}
                        {run.renderedChildren}
                        {'\u2069'}
                    </Text>
                )
            })}
        </View>
    )
}

export default MarkdownTextGroup
