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
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

const ChatMenu = () => {
    const { spacing } = Theme.useTheme()
    const { unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
        }))
    )

    const { chat, unloadChat } = Chats.useChat()

    const { showSettings, setShowSettings, showChats, setShowChats } = Drawer.useDrawerState(
        (state) => ({
            showSettings: state.values?.[Drawer.ID.SETTINGS],
            setShowSettings: (b: boolean) => state.setShow(Drawer.ID.SETTINGS, b),
            showChats: state.values?.[Drawer.ID.CHATLIST],
            setShowChats: (b: boolean) => state.setShow(Drawer.ID.CHATLIST, b),
        })
    )

    useEffect(() => {
        return () => {
            unloadCharacter()
            unloadChat()
        }
    }, [])

    const handleLeftFling = () => {
        if (showSettings) return setShowSettings(false)
        if (chat) setShowChats(true)
    }

    const handleRightFlight = () => {
        if (showChats) return setShowChats(false)
        setShowSettings(true)
    }

    const swipeDrawer = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(handleRightFlight)()
        })
        .runOnJS(true)

    const swipeChats = Gesture.Fling()
        .direction(3)
        .onEnd(() => {
            runOnJS(handleLeftFling)()
        })
        .runOnJS(true)

    const gesture = Gesture.Exclusive(swipeDrawer, swipeChats)

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <HeaderTitle />
                <HeaderButton
                    headerLeft={() => !showChats && <Drawer.Button drawerId={Drawer.ID.SETTINGS} />}
                    headerRight={() =>
                        !showSettings && (
                            <Drawer.Button drawerId={Drawer.ID.CHATLIST} openIcon="message1" />
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
        </GestureDetector>
    )
}

export default ChatMenu
