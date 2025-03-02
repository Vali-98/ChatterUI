import Drawer from '@components/views/Drawer'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { getFriendlyTimeStamp } from '@lib/utils/Time'
import { Text, TouchableOpacity, View } from 'react-native'

type ChatDrawerSearchItemProps = {
    query: string
    item: Awaited<ReturnType<typeof Chats.db.query.searchChat>>[0]
    onLoad: (id: number) => void
}

const ChatDrawerSearchItem: React.FC<ChatDrawerSearchItemProps> = ({ item, onLoad, query }) => {
    const { color, spacing, fontSize } = Theme.useTheme()

    const segmented = segmentText(item.swipe, query)

    return (
        <TouchableOpacity
            onPress={() => onLoad(item.chatId)}
            style={{
                paddingHorizontal: spacing.m,
                paddingVertical: spacing.m,
                rowGap: 2,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: color.text._300, fontSize: fontSize.m, fontWeight: '500' }}>
                    {item.chatName}
                </Text>
                <Text style={{ color: color.text._600, fontSize: fontSize.s }}>
                    {getFriendlyTimeStamp(item.sendDate.getTime())}
                </Text>
            </View>
            <Text>
                {segmented.showHeadEllipsis && <Text style={{ color: color.text._500 }}>...</Text>}
                <Text style={{ color: color.text._500 }}>{segmented.head.trimStart()}</Text>
                <Text style={{ color: color.text._300, fontWeight: '700' }}>{segmented.query}</Text>
                <Text style={{ color: color.text._500 }}>{segmented.tail.trimEnd()}</Text>
                {segmented.showTailEllipsis && <Text style={{ color: color.text._500 }}>...</Text>}
            </Text>
        </TouchableOpacity>
    )
}

export default ChatDrawerSearchItem

const WINDOW = 50 // Characters before & after the query

type SnippetResult = {
    head: string
    query: string
    tail: string
    showHeadEllipsis: boolean
    showTailEllipsis: boolean
}

const segmentText = (text: string, query: string): SnippetResult => {
    if (!query)
        return { head: text, query: '', tail: '', showHeadEllipsis: false, showTailEllipsis: false }

    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    if (index === -1) {
        return { head: text, query: '', tail: '', showHeadEllipsis: false, showTailEllipsis: false }
    }
    const start = Math.max(0, index - WINDOW)
    const end = Math.min(text.length, index + query.length + WINDOW)

    const snippet = text.slice(start, end)
    const queryIndex = snippet.toLowerCase().indexOf(lowerQuery)

    const head = snippet.slice(0, queryIndex)
    const queryText = snippet.slice(queryIndex, queryIndex + query.length)
    const tail = snippet.slice(queryIndex + query.length)
    const showHeadEllipsis = start > 0
    const showTailEllipsis = end < text.length

    return {
        head: head,
        query: queryText,
        tail: tail,
        showHeadEllipsis: showHeadEllipsis,
        showTailEllipsis: showTailEllipsis,
    }
}
