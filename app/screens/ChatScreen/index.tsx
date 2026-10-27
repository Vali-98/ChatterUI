import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import AvatarViewer from '@components/views/AvatarViewer'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import SettingsDrawer from '@components/views/SettingsDrawer'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import { FileUtils } from '@lib/utils/File'
import ChatInput from '@screens/ChatScreen/ChatInput'
import ChatsDrawer from '@screens/ChatScreen/ChatsDrawer'
import ChatWindow from '@screens/ChatScreen/ChatWindow'

import AuthorNoteSheet from './AuthorNote'
import AuthorNoteEditor from './AuthorNote/AuthorNoteEditor'
import ChatEditor from './ChatWindow/ChatEditor'
import SummarySheet from './Summaries'

const ChatScreen = () => {
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()
    const { clearCharacterSelection, characterId } = Characters.useCharacterState(
        useShallow((state) => ({
            clearCharacterSelection: state.unloadCard,
            characterId: state.id,
        }))
    )
    const userId = Characters.useUserStore(useShallow((state) => state.id))

    const { height } = useReanimatedKeyboardAnimation()
    const animatedStyle = useAnimatedStyle(() => {
        return {
            paddingBottom: -height.value - insets.bottom,
            flex: 1,
        }
    })

    const { chatId, setId, resetId, scrollData } = Chats.useChat()

    const { showSettings, showChats } = Drawer.useDrawerStore(
        useShallow((state) => ({
            showSettings: state.values?.[Drawer.ID.SETTINGS],
            showChats: state.values?.[Drawer.ID.CHATLIST],
        }))
    )

    useEffect(() => {
        return () => {
            clearCharacterSelection()
            resetId()
        }
    }, [clearCharacterSelection, resetId])

    const handleCreateChat = async () => {
        if (characterId)
            Chats.actions.createChat(characterId).then((chatId) => {
                if (chatId) setId(chatId)
            })
    }

    const handleImportChat = async () => {
        if (!characterId || !userId) {
            Logger.errorToast(t('chat.import.errors.noChatCharacter'))
            return
        }
        const file = await FileUtils.pickText({ type: 'application/json' })
        if (!file.success) return
        try {
            await Chats.actions.importChat(characterId, JSON.parse(file.data))
        } catch (error) {
            Logger.errorToast(t('chat.import.errors.failedToImport'))
            Logger.error(String(error))
        }
    }

    const renderHeaderButtonRight = () => {
        return (
            !showSettings && (
                <>
                    {!showChats ? (
                        <ThemedButton
                            buttonStyle={{
                                marginRight: 16,
                            }}
                            iconName="plus"
                            variant="tertiary"
                            iconSize={24}
                            onPress={handleCreateChat}
                        />
                    ) : (
                        <ThemedButton
                            buttonStyle={{
                                marginRight: 16,
                            }}
                            iconName="upload"
                            variant="tertiary"
                            iconSize={20}
                            onPress={handleImportChat}
                        />
                    )}
                    <Drawer.Button drawerID={Drawer.ID.CHATLIST} openIcon="message" />
                </>
            )
        )
    }

    const renderHeaderButtonLeft = () => {
        return !showChats && <Drawer.Button drawerID={Drawer.ID.SETTINGS} />
    }

    return (
        <Drawer.Gesture
            config={[
                {
                    drawerID: Drawer.ID.CHATLIST,
                    openDirection: 'left',
                    closeDirection: 'right',
                },
                {
                    drawerID: Drawer.ID.SETTINGS,
                    openDirection: 'right',
                    closeDirection: 'left',
                },
            ]}>
            <View style={{ flex: 1, paddingBottom: insets.bottom + 4 }}>
                <Animated.View style={animatedStyle}>
                    <HeaderTitle />
                    <HeaderButton
                        headerLeft={renderHeaderButtonLeft}
                        headerRight={renderHeaderButtonRight}
                    />
                    <View style={{ flex: 1 }}>
                        {typeof chatId === 'number' && (
                            <ChatWindow chatId={chatId} scrollData={scrollData} />
                        )}
                        <ChatInput />
                        <AvatarViewer />
                        <ChatEditor />
                        <SummarySheet />
                        <AuthorNoteSheet />
                        <AuthorNoteEditor />
                    </View>
                </Animated.View>

                {/**Drawer has to be outside of the KeyboardAvoidingView */}
                <SettingsDrawer />
                <ChatsDrawer />
            </View>
        </Drawer.Gesture>
    )
}

export default ChatScreen
