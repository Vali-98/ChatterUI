import { View, Text, Image, StyleSheet } from 'react-native'
import { ReactNode, useEffect, useState } from 'react'
import { ChatEntry } from '@constants/Chat'
import { Users, Characters, Color } from '@globals'
import TTSMenu from './TTS'

type ChatFrameProps = {
    children?: ReactNode
    message: ChatEntry
    userName: string
    charName: string
    TTSenabled: boolean
    id: number
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({
    children,
    message,
    userName,
    charName,
    TTSenabled,
    id,
    isLast,
}) => {
    const imageDir = message.is_user
        ? Users.getImageDir(userName)
        : Characters.getImageDir(charName)

    const [imageSource, setImageSource] = useState({
        uri: imageDir,
    })

    useEffect(() => {
        const newdir = message.is_user
            ? Users.getImageDir(userName)
            : Characters.getImageDir(charName)
        setImageSource({ uri: newdir })
    }, [charName])

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }

    const deltaTime = Math.max(
        0,
        (Date.parse(message.gen_finished) - Date.parse(message.gen_started)) / 1000
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
                {TTSenabled && <TTSMenu message={message.mes} isLast={isLast} />}
            </View>
            <View style={{ flex: 1, flexDirection: 'column' }}>
                <View style={{ flex: 1 }}>
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, color: Color.Text, marginRight: 4 }}>
                            {message.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: Color.Text }}>{message.send_date}</Text>
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
        color: Color.Offwhite,
        paddingTop: 4,
    },
})
