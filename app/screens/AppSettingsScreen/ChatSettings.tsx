import { useTextIntentStatus } from '@vali98/react-native-process-text'
import { useRouter } from 'expo-router'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

const ChatSettings = () => {
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoLoadUser, setAutoLoadUser] = useMMKVBoolean(AppSettings.AutoLoadUser)
    const [autoTitle, setAutoTitle] = useMMKVBoolean(AppSettings.AutoGenerateTitle)
    const { enabled: textIntent, setEnabled: setTextIntent } = useTextIntentStatus()
    const router = useRouter()
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Chat</SectionTitle>

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
                label="Automatically Generate Titles"
                value={autoTitle}
                onChangeValue={setAutoTitle}
                description="Automatically generates titles for chats (only in Remote mode)"
            />

            <ThemedSwitch
                label="Ask In ChatterUI"
                value={textIntent}
                onChangeValue={setTextIntent}
                description="Adds ChatterUI as a search option when highlighting text"
            />

            <ThemedButton
                label="Chat Style"
                variant="secondary"
                onPress={() => router.push('/screens/AppSettingsScreen/ChatStyleSettings')}
            />
        </View>
    )
}

export default ChatSettings
