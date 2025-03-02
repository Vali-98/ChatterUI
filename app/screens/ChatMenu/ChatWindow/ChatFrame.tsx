import Avatar from '@components/views/Avatar'
import { useViewerState } from '@lib/state/AvatarViewer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { useTTSState } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

import TTSMenu from './TTS'

type ChatFrameProps = {
    children?: ReactNode
    index: number
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({ children, index, nowGenerating, isLast }) => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    const message = Chats.useEntryData(index)
    const setShowViewer = useViewerState((state) => state.setShow)
    const enabled = useTTSState((state) => state.enabled)
    const charImageId = Characters.useCharacterCard((state) => state.card?.image_id) ?? 0
    const userImageId = Characters.useUserCard((state) => state.card?.image_id) ?? 0

    const swipe = message.swipes[message.swipe_id]

    const getDeltaTime = () =>
        Math.round(
            Math.max(
                0,
                ((nowGenerating && isLast ? Date.now() : swipe.gen_finished.getTime()) -
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
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: borderRadius.xl,
                            marginBottom: spacing.sm,
                            marginLeft: spacing.sm,
                            marginRight: spacing.m,
                        }}
                        targetImage={Characters.getImageDir(
                            message.is_user ? userImageId : charImageId
                        )}
                    />
                </TouchableOpacity>

                <Text
                    style={{
                        color: color.text._400,
                        paddingTop: spacing.sm,
                    }}>
                    #{index}
                </Text>
                {deltaTime !== undefined && !message.is_user && index !== 0 && (
                    <Text
                        style={{
                            color: color.text._400,
                            paddingTop: spacing.sm,
                        }}>
                        {deltaTime}s
                    </Text>
                )}
                {enabled && <TTSMenu index={index} />}
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <View style={{ marginBottom: spacing.m }}>
                        <Text
                            style={{
                                fontSize: fontSize.l,
                                color: color.text._100,
                                marginRight: spacing.sm,
                            }}>
                            {message.name}
                        </Text>
                        <Text style={{ fontSize: fontSize.s, color: color.text._400 }}>
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
