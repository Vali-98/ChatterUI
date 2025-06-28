import ThemedButton from '@components/buttons/ThemedButton'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import ChatInput from '@screens/ChatMenu/ChatInput'
import AvatarViewer from '@screens/ChatMenu/ChatWindow/AvatarViewer'
import ChatWindow from '@screens/ChatMenu/ChatWindow/ChatWindow'
import ChatsDrawer from '@screens/ChatMenu/ChatsDrawer'
import SettingsDrawer from '@screens/SettingsDrawer'
import { useEffect } from 'react'
import { SafeAreaView, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const ChatMenu = () => {
    const { unloadCharacter, charId } = Characters.useCharacterCard(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
            charId: state.id,
        }))
    )

    const { chat, unloadChat, loadChat } = Chats.useChat()

    const { showSettings, showChats } = Drawer.useDrawerState(
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
                { drawerID: Drawer.ID.CHATLIST, openDirection: 'left', closeDirection: 'right' },
                { drawerID: Drawer.ID.SETTINGS, openDirection: 'right', closeDirection: 'left' },
            ]}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
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

                <View
                    style={{
                        flex: 1,
                    }}>
                    {chat && <ChatWindow />}
                    <ChatInput />
                </View>
                <AvatarViewer />
                <ChatsDrawer />
                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default ChatMenu
