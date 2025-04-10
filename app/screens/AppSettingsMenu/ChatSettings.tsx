import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const ChatSettings = () => {
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [autoLoadUser, setAutoLoadUser] = useMMKVBoolean(AppSettings.AutoLoadUser)

    const [showTokensPerSecond, setShowTokensPerSecond] = useMMKVBoolean(
        AppSettings.ShowTokenPerSecond
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Chat</SectionTitle>

            <ThemedSwitch
                label="Auto Scroll"
                value={autoScroll}
                onChangeValue={setAutoScroll}
                description="Autoscrolls text during generations"
            />

            <ThemedSwitch
                label="Use First Message"
                value={firstMes}
                onChangeValue={setFirstMes}
                description="Disabling this will make new chats start blank, needed by specific models"
            />

            <ThemedSwitch
                label="Load Chat On Startup"
                value={chatOnStartup}
                onChangeValue={setChatOnStartup}
                description="Loads the most recent chat on startup"
            />

            <ThemedSwitch
                label="Auto Load User"
                value={autoLoadUser}
                onChangeValue={setAutoLoadUser}
                description="When opening a chat, automatically loads the User the chat was created with"
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
        </View>
    )
}

export default ChatSettings
