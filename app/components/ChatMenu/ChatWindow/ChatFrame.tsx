import Avatar from '@components/Avatar'
import { useViewerState } from '@constants/AvatarViewer'
import { Characters, Global, Style } from '@globals'
import { Chats } from 'app/constants/Chat'
import { ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import TTSMenu from './TTS'

type ChatFrameProps = {
    children?: ReactNode
    id: number
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({ children, id, nowGenerating, isLast }) => {
    const { message } = Chats.useChat(
        useShallow((state) => ({
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
        }))
    )

    const setShowViewer = useViewerState((state) => state.setShow)

    const [TTSenabled, setTTSenabled] = useMMKVBoolean(Global.TTSEnable)
    const charImageId = Characters.useCharacterCard((state) => state.card?.image_id) ?? 0
    const userImageId = Characters.useUserCard((state) => state.card?.image_id) ?? 0

    const swipe = message.swipes[message.swipe_id]

    const getDeltaTime = () =>
        Math.round(
            Math.max(
                0,
                ((nowGenerating && isLast ? new Date().getTime() : swipe.gen_finished.getTime()) -
                    swipe.gen_started.getTime()) /
                    1000
            )
        )
    const deltaTime = getDeltaTime()

    return (
        <View style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowViewer(true, message.is_user)}>
                    <Avatar
                        style={styles.avatar}
                        targetImage={Characters.getImageDir(
                            message.is_user ? userImageId : charImageId
                        )}
                    />
                </TouchableOpacity>

                <Text style={styles.graytext}>#{id}</Text>
                {deltaTime !== undefined && !message.is_user && id !== 0 && (
                    <Text style={styles.graytext}>{deltaTime}s</Text>
                )}
                {TTSenabled && <TTSMenu id={id} isLast={isLast} />}
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
                <View style={{ flex: 1 }}>
                    <View style={{ marginBottom: 8 }}>
                        <Text
                            style={{
                                fontSize: 16,
                                color: Style.getColor('primary-text1'),
                                marginRight: 4,
                            }}>
                            {message.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: Style.getColor('primary-text2') }}>
                            {swipe.gen_finished.toLocaleTimeString()}
                        </Text>
                    </View>
                </View>
                {children}
            </View>
        </View>
    )
}

export default ChatFrame

const styles = StyleSheet.create({
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginBottom: 4,
        marginLeft: 4,
        marginRight: 8,
    },

    graytext: {
        color: Style.getColor('primary-text2'),
        paddingTop: 4,
    },
})
