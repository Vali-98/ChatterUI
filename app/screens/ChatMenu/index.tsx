import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import ChatInput from '@screens/ChatMenu/ChatInput'
import AvatarViewer from '@screens/ChatMenu/ChatWindow/AvatarViewer'
import ChatWindow from '@screens/ChatMenu/ChatWindow/ChatWindow'
import ChatsDrawer from '@screens/ChatMenu/ChatsDrawer'
import OptionsMenu from '@screens/ChatMenu/OptionsMenu'
import SettingsDrawer from '@screens/SettingsDrawer'
import { useEffect } from 'react'
import { SafeAreaView, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const ChatMenu = () => {
    const { spacing } = Theme.useTheme()
    const { unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
        }))
    )

    const { chat, unloadChat } = Chats.useChat()

    const { showSettings, showChats } = Drawer.useDrawerState((state) => ({
        showSettings: state.values?.[Drawer.ID.SETTINGS],
        showChats: state.values?.[Drawer.ID.CHATLIST],
    }))

    useEffect(() => {
        return () => {
            unloadCharacter()
            unloadChat()
        }
    }, [])

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
                            <Drawer.Button drawerID={Drawer.ID.CHATLIST} openIcon="message1" />
                        )
                    }
                />

                <View
                    style={{
                        flex: 1,
                    }}>
                    {chat && <ChatWindow />}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginVertical: spacing.m,
                            paddingHorizontal: spacing.l,
                        }}>
                        <AvatarViewer />
                        <OptionsMenu />
                        <ChatInput />
                    </View>
                </View>

                <ChatsDrawer />
                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default ChatMenu
