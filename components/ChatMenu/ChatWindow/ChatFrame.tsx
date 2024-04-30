import { View, Text, Image, StyleSheet } from 'react-native'
import { ReactNode, useEffect, useState } from 'react'
import { ChatEntry, Chats } from '@constants/Chat'
import { Users, Characters, Style } from '@globals'
import TTSMenu from './TTS'
import { useShallow } from 'zustand/react/shallow'

type ChatFrameProps = {
    children?: ReactNode
    userName: string
    TTSenabled: boolean
    id: number
    charId: number
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({
    children,
    charId,
    userName,
    TTSenabled,
    id,
    nowGenerating,
    isLast,
}) => {
    const { message } = Chats.useChat(
        useShallow((state) => ({
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
        }))
    )
    const imageDir = message.is_user
        ? Users.getImageDir(userName)
        : Characters.useCharacterCard.getState().getImage()
    const swipe = message.swipes[message.swipe_id]
    const [imageSource, setImageSource] = useState({
        uri: imageDir,
    })

    useEffect(() => {
        const newdir = message.is_user
            ? Users.getImageDir(userName)
            : Characters.useCharacterCard.getState().getImage()
        setImageSource({ uri: newdir })
    }, [message.is_user])

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }
    const deltaTime = Math.round(
        Math.max(
            0,
            ((nowGenerating && isLast ? new Date().getTime() : swipe.gen_finished.getTime()) -
                swipe.gen_started.getTime()) /
                1000
        )
    )
    // TODO: Change TTS to take id and simply retrieve that data on TTS as needed
    return (
        <View style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center' }}>
                <Image
                    onError={(error) => {
                        handleImageError()
                    }}
                    style={styles.avatar}
                    source={imageSource}
                />
                <Text style={styles.graytext}>#{id}</Text>
                {deltaTime !== undefined && !message.is_user && id !== 0 && (
                    <Text style={styles.graytext}>{deltaTime}s</Text>
                )}
                {TTSenabled && <TTSMenu message={swipe.swipe} isLast={isLast} />}
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
                            {swipe.send_date.toLocaleTimeString()}
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
