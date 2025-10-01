import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const ChatWindowSettings = () => {
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [quickDelete, setQuickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const [saveScroll, setSaveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [alternate, setAlternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)
    const [wide, setWide] = useMMKVBoolean(AppSettings.WideChatMode)

    const [showTokensPerSecond, setShowTokensPerSecond] = useMMKVBoolean(
        AppSettings.ShowTokenPerSecond
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Chat Window</SectionTitle>

            <ThemedSwitch
                label="Auto Scroll"
                value={autoScroll}
                onChangeValue={setAutoScroll}
                description="Autoscrolls text during generations"
            />

            <ThemedSwitch
                label="Send on Enter"
                value={sendOnEnter}
                onChangeValue={setSendOnEnter}
                description="Submits messages when Enter is pressed"
            />

            <ThemedSwitch
                label="Show Tokens Per Second"
                value={showTokensPerSecond}
                onChangeValue={setShowTokensPerSecond}
                description="Show tokens per second when using local models"
            />

            <ThemedSwitch
                label="Quick Delete"
                value={quickDelete}
                onChangeValue={setQuickDelete}
                description="Toggle delete button in chat options bar"
            />

            <ThemedSwitch
                label="Save Scroll Position"
                value={saveScroll}
                onChangeValue={setSaveScroll}
                description="Automatically move to last scrolled position in chat"
            />

            <ThemedSwitch
                label="Wide Chat"
                value={wide}
                onChangeValue={setWide}
                description="Removes whitespace for wider chat"
            />

            <ThemedSwitch
                label="Alternate User and Character Positions"
                value={alternate}
                onChangeValue={setAlternate}
                description="Left align character chats and right aligns user chats"
            />
        </View>
    )
}

export default ChatWindowSettings
