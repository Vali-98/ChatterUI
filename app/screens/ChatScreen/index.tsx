import ThemedButton from '@components/buttons/ThemedButton'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import ChatInput from '@screens/ChatScreen/ChatInput'
import AvatarViewer from '@components/views/AvatarViewer'
import ChatWindow from '@screens/ChatScreen/ChatWindow'
import ChatsDrawer from '@screens/ChatScreen/ChatsDrawer'
import SettingsDrawer from '@components/views/SettingsDrawer'
import { useEffect } from 'react'
import { View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'
import { useChatEditorStore } from './ChatWindow/ChatEditor'

const ChatMenu = () => {
    const insets = useSafeAreaInsets()
    const { unloadCharacter, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
            charId: state.id,
        }))
    )

    const editorVisible = useChatEditorStore(useShallow((state) => state.editMode))

    const { chat, unloadChat, loadChat } = Chats.useChat()

    const { showSettings, showChats } = Drawer.useDrawerStore(
        useShallow((state) => ({
            showSettings: state.values?.[Drawer.ID.SETTINGS],
            showChats: state.values?.[Drawer.ID.CHATLIST],
        }))
    )

    useEffect(() => {
        return () => {
            unloadCharacter()
            unloadChat()
        }
    }, [])

    const handleCreateChat = async () => {
        if (charId)
            Chats.db.mutate.createChat(charId).then((chatId) => {
                if (chatId) loadChat(chatId)
            })
    }

    // TODO: This is a fix for gesture vs 3-button nav for android
    const getOffset = () => {
        // assume gesture nav, 54 is arbitrary keyboard nav height
        if (insets.bottom < 30) return insets.bottom + 54
        return insets.bottom
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
            <View style={{ flex: 1 }}>
                <HeaderTitle />
                <HeaderButton
                    headerLeft={() => !showChats && <Drawer.Button drawerID={Drawer.ID.SETTINGS} />}
                    headerRight={() =>
                        !showSettings && (
                            <>
                                {!showChats && (
                                    <ThemedButton
                                        buttonStyle={{
                                            marginRight: 16,
                                        }}
                                        iconName="plus"
                                        variant="tertiary"
                                        iconSize={24}
                                        onPress={handleCreateChat}
                                    />
                                )}
                                <Drawer.Button drawerID={Drawer.ID.CHATLIST} openIcon="message1" />
                            </>
                        )
                    }
                />
                <KeyboardAvoidingView
                    enabled={!editorVisible}
                    keyboardVerticalOffset={getOffset()}
                    behavior="translate-with-padding"
                    style={{ flex: 1, paddingBottom: insets.bottom }}>
                    {chat && <ChatWindow />}
                    <ChatInput />
                    <AvatarViewer />
                </KeyboardAvoidingView>
                {/**Drawer has to be outside of the KeyboardAvoidingView */}
                <SettingsDrawer useInset />
                <ChatsDrawer />
            </View>
        </Drawer.Gesture>
    )
}

export default ChatMenu
