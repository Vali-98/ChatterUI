import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import GuideTarget from '@components/guides/GuideTarget'
import ContextMenu from '@components/views/ContextMenu'
import ContextUsage from '@components/views/ContextUsage'
import Drawer from '@components/views/Drawer'
import { Chats } from '@lib/state/chat'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { Theme } from '@lib/theme/ThemeManager'

import { useAuthorNoteState } from '../AuthorNote'

type ChatOptionsProps = {
    disabled: boolean
}

const ChatOptions: React.FC<ChatOptionsProps> = ({ disabled }) => {
    const { t } = useTranslation()
    const router = useRouter()
    const styles = useStyles()
    // The percentage-based graph follows the action rows instead of sizing the menu.
    const [optionsWidth, setOptionsWidth] = useState(0)
    const { ref } = useAuthorNoteState()
    const chatId = Chats.useChatState((state) => state.id)
    const openSummaries = useSummaryPanelState((state) => state.open)
    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowChat = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    return (
        <ContextMenu disabled={disabled} placement="top">
            <GuideTarget id="chat.options">
                <ContextMenu.Trigger>
                    <AntDesign
                        name="caret-up"
                        style={[styles.optionsButton, { opacity: disabled ? 0.5 : 1 }]}
                        size={24}
                    />
                </ContextMenu.Trigger>
            </GuideTarget>
            <ContextMenu.Body>
                <View style={{ width: optionsWidth, alignSelf: 'flex-start' }}>
                    <ContextUsage compact />
                </View>
                <ContextMenu.Divider />
                <View
                    style={{ alignSelf: 'flex-start' }}
                    onLayout={(event) =>
                        setOptionsWidth(Math.ceil(event.nativeEvent.layout.width))
                    }>
                    <ContextMenu.Button
                        closeOnPress={false}
                        onPress={(close) => {
                            close()
                            router.back()
                        }}
                        label={t('chat.input.actions.mainMenu')}
                        icon="left"
                    />
                    <ContextMenu.Button
                        label={t('summary.title')}
                        icon="file-text"
                        disabled={chatId === undefined}
                        onPress={() => {
                            if (chatId !== undefined) openSummaries(chatId)
                        }}
                    />
                    <ContextMenu.Button
                        onPress={() => {
                            ref?.current?.open()
                        }}
                        label={t('chat.input.actions.authorNotes')}
                        icon="paper-clip"
                    />
                    <ContextMenu.Button
                        closeOnPress={false}
                        onPress={(close) => {
                            close()
                            router.push('/screens/CharacterEditorScreen')
                        }}
                        label={t('chat.input.actions.editCharacter')}
                        icon="edit"
                    />
                    <ContextMenu.Button
                        onPress={() => {
                            setShowChat(true)
                        }}
                        label={t('chat.input.actions.chatHistory')}
                        icon="paper-clip"
                    />
                </View>
            </ContextMenu.Body>
        </ContextMenu>
    )
}

export default ChatOptions

const useStyles = () => {
    const { color } = Theme.useTheme()

    return StyleSheet.create({
        optionsButton: {
            color: color.text._500,
            padding: 4,
            backgroundColor: color.neutral._200,
            borderRadius: 16,
        },
    })
}
