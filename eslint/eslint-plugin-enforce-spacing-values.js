const allowedValues = [0, 2, 4, 8, 12, 16, 24]

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce border, padding, and margin values to be 0, 2, 4, 8, 12, or 16',
            category: 'Stylistic Issues',
            recommended: false,
        },
        schema: [], // no options
        messages: {
            invalidValue: `The value '{{value}}' for '{{property}}' is not allowed. Use ${allowedValues.toString()} instead.`,
        },
    },
    create(context) {
        const relevantProperties = [
            'margin',
            'marginTop',
            'marginBottom',
            'marginLeft',
            'marginRight',
            'marginHorizontal',
            'marginVertical',
            'padding',
            'paddingTop',
            'paddingBottom',
            'paddingLeft',
            'paddingRight',
            'paddingHorizontal',
            'paddingVertical',
            'borderRadius',
        ]

        return {
            Property(node) {
                if (relevantProperties.includes(node.key.name)) {
                    const value = node.value.value
                    if (typeof value === 'number' && !allowedValues.includes(value)) {
                        context.report({
                            node,
                            messageId: 'invalidValue',
                            data: {
                                value,
                                property: node.key.name,
                            },
                        })
                    }
                }
            },
        }
    },
}
