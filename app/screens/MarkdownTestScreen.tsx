import React from 'react'
import { ScrollView, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

import HeaderTitle from '@components/views/HeaderTitle'
import { MarkdownStyle } from '@lib/markdown/Markdown'

const markdownData = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
Here's some regular text

---

A **strong** (bold) text example.

A *emphasized* (italic) text example.

A ~~strikethrough~~ text example.

> This is a blockquote.  
> > This is a nested blockquote.
> 
> Exit
> > Again!

- Bullet list item 1
- Bullet list item 2
- Bullet list item 3

1. Ordered list item 1
2. Ordered list item 2
3. Ordered list item 3

A list inside a list:

- Item 1
  - Sub-item 1
  - Sub-item 2

Inline \`code_inline\` example.

\`\`\`SourceInfo
Here is a block code
\`\`\`


Latex Plugin:
- Block:

$$\\frac{d}{dx} \\left( \\int_{0}^{x} e^{-t^2} \\, dt \\right)^2$$

- Inline: 

$s = ut + \\frac{1}{2}at^2$ distance from initial velocity, time and acceleration

| Row One  | Row Two | Row Three   |
|----------|--------:|-------------|
| Item 1   |  row    | row         |
| Item 2   |  row    | row         |
| Item 3   |  row    | row         |
| Item 4   |  row    | row         |


# Quote Testing

1. Basic curly quote direction (must pass)
“hello world”
She said “hello”
“start” middle “end”

2. Simple nesting (core test)
“outer “inner” outer”
“He said “she said “nested” quote” end”
“a “b “c” b” a”

3. Broken / malformed nesting (important edge cases)
”broken start“
“missing close
missing open”
“outer ”inner“ outer”

4. Mixed ASCII + curly quotes (very common in real content)
"simple ascii"
“mixed "ascii" inside”
"outer “inner” outer"
“outer "inner” mixed"


5. Adjacent quotes (token boundary stress test)
\“”“triple start”
“a”“b”“c”
“”“”

6. Empty / minimal content
“”
""
“a”

7. Punctuation-heavy realism (real Markdown usage)
She said “hello, world!” and left.
“Wait—what?” he asked.
The label reads “version 2.0 (beta)”.

8. Deep nesting stress test (stack requirement reveal)
“1 “2 “3 “4” 3” 2” 1”

9. No-quote baseline (should remain untouched)
hello world
this is (normal text)
no quotes here at all

10. Mixed formatting noise (real-world Markdown-like text)
Here is “quoted text” and here is more “nested “deep” quote” content.
Text before “quote” text after, then “another “level” inside”.


11. Known crash cause
"Test *"*
"Test _"_ test

`

const MarkdownTestScreen = () => {
    const markdownStyle = MarkdownStyle.useMarkdownStyle()

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <HeaderTitle title="Markdown Test" />
            <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }} style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <Markdown
                        mergeStyle={false}
                        markdownit={MarkdownStyle.Rules}
                        rules={MarkdownStyle.RenderRules}
                        style={markdownStyle}>
                        {markdownData}
                    </Markdown>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default MarkdownTestScreen
