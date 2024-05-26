import { Chats } from '@constants/Chat'
import { Characters, Style } from '@globals'
import { ReactNode, useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import TTSMenu from './TTS'

type ChatFrameProps = {
    children?: ReactNode
    TTSenabled: boolean
    id: number
    charId: number
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({
    children,
    TTSenabled,
    id,
    nowGenerating,
    isLast,
}) => {
    const { message, buffer } = Chats.useChat(
        useShallow((state) => ({
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
            buffer: state.buffer,
        }))
    )

    const charImageId = Characters.useCharacterCard((state) => state.card?.data.image_id) ?? 0
    const userImageId = Characters.useUserCard((state) => state.card?.data.image_id) ?? 0

    const imageDir = message.is_user
        ? Characters.getImageDir(userImageId)
        : Characters.getImageDir(charImageId)
    const swipe = message.swipes[message.swipe_id]
    const [imageSource, setImageSource] = useState({
        uri: imageDir,
    })

    useEffect(() => {
        const newdir = message.is_user
            ? Characters.getImageDir(userImageId)
            : Characters.getImageDir(charImageId)
        setImageSource({ uri: newdir })
    }, [message.is_user, charImageId, userImageId])

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
                        error.stopPropagation()
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
