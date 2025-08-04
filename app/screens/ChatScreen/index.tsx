import ThemedButton from '@components/buttons/ThemedButton'
import AvatarViewer from '@components/views/AvatarViewer'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import SettingsDrawer from '@components/views/SettingsDrawer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import ChatInput, { useInputHeightStore } from '@screens/ChatScreen/ChatInput'
import ChatWindow from '@screens/ChatScreen/ChatWindow'
import ChatsDrawer from '@screens/ChatScreen/ChatsDrawer'
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

    const chatInputHeight = useInputHeightStore(useShallow((state) => state.height))
    const heightOffset = insets.bottom < 25 ? chatInputHeight : 0

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
                    keyboardVerticalOffset={insets.bottom + heightOffset}
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
