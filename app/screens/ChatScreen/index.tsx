import ThemedButton from '@components/buttons/ThemedButton'
import AvatarViewer from '@components/views/AvatarViewer'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import SettingsDrawer from '@components/views/SettingsDrawer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import ChatInput from '@screens/ChatScreen/ChatInput'
import ChatWindow from '@screens/ChatScreen/ChatWindow'
import ChatsDrawer from '@screens/ChatScreen/ChatsDrawer'
import { useEffect } from 'react'
import { View } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'
import ChatEditor from './ChatWindow/ChatEditor'

const ChatScreen = () => {
    const insets = useSafeAreaInsets()
    const { unloadCharacter, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
            charId: state.id,
        }))
    )

    const { height, progress } = useReanimatedKeyboardAnimation()
    const animatedStyle = useAnimatedStyle(() => {
        return {
            paddingBottom: (-height.value - insets.bottom) * progress.value + insets.bottom,
            flex: 1,
        }
    })

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

    const renderHeaderButtonRight = () => {
        return (
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
            <View style={{ flex: 1 }}>
                <Animated.View style={animatedStyle}>
                    <HeaderTitle />
                    <HeaderButton
                        headerLeft={renderHeaderButtonLeft}
                        headerRight={renderHeaderButtonRight}
                    />
                    <View style={{ flex: 1 }}>
                        {chat && <ChatWindow />}
                        <ChatInput />
                        <AvatarViewer />
                        <ChatEditor />
                    </View>
                </Animated.View>

                {/**Drawer has to be outside of the KeyboardAvoidingView */}
                <SettingsDrawer useInset />
                <ChatsDrawer />
            </View>
        </Drawer.Gesture>
    )
}

export default ChatScreen
