import { View, Text, Image, StyleSheet } from 'react-native'
import { ReactNode, useEffect, useState } from 'react'
import { ChatEntry } from '@constants/Chat'
import { Users, Characters, Style } from '@globals'
import TTSMenu from './TTS'

type ChatFrameProps = {
    children?: ReactNode
    message: ChatEntry
    userName: string
    TTSenabled: boolean
    id: number
    charId: number
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({
    children,
    message,
    charId,
    userName,
    TTSenabled,
    id,
    isLast,
}) => {
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
    }, [charId])

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }
    const deltaTime = Math.round(
        Math.max(0, (swipe.gen_finished.getTime() - swipe.gen_started.getTime()) / 1000)
    )
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
