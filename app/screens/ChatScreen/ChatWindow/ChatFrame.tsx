import Avatar from '@components/views/Avatar'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useAvatarViewerStore } from '@lib/state/AvatarViewer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

type ChatFrameProps = {
    children?: ReactNode
    index: number
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({ children, index, nowGenerating, isLast }) => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    const [wide, _] = useMMKVBoolean(AppSettings.WideChatMode)
    const [alternate, __] = useMMKVBoolean(AppSettings.AlternatingChatMode)
    const message = Chats.useEntryData(index)
    const setShowViewer = useAvatarViewerStore((state) => state.setShow)
    const charImageId = Characters.useCharacterStore((state) => state.card?.image_id) ?? 0
    const userImageId = Characters.useUserStore((state) => state.card?.image_id) ?? 0

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

    const rowDir = message.is_user && alternate ? 'row-reverse' : 'row'
    const align = message.is_user && alternate ? 'flex-end' : 'flex-start'
    if (wide)
        return (
            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <View
                    style={{
                        flexDirection: rowDir,
                        alignItems: 'center',
                        marginBottom: spacing.l,
                    }}>
                    <TouchableOpacity onPress={() => setShowViewer(true, message.is_user)}>
                        <Avatar
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: borderRadius.xl,
                                marginRight: message.is_user && alternate ? 0 : spacing.l,
                                marginLeft: message.is_user && alternate ? spacing.l : 0,
                            }}
                            targetImage={Characters.getImageDir(
                                message.is_user ? userImageId : charImageId
                            )}
                        />
                    </TouchableOpacity>
                    <View style={{ alignItems: align }}>
                        <Text
                            style={{
                                fontSize: fontSize.l,
                                color: color.text._100,
                            }}>
                            {message.name}
                        </Text>
                        <View style={{ columnGap: 12, flexDirection: rowDir }}>
                            <Text style={{ fontSize: fontSize.s, color: color.text._400 }}>
                                {swipe.gen_finished.toLocaleTimeString()}
                            </Text>
                            <Text style={{ color: color.text._700, fontSize: fontSize.s }}>
                                #{index}
                            </Text>
                            {deltaTime !== undefined && !message.is_user && index !== 0 && (
                                <Text style={{ color: color.text._700, fontSize: fontSize.s }}>
                                    {deltaTime}s
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
                {children}
            </View>
        )

    return (
        <View style={{ flexDirection: rowDir }}>
            <View
                style={{
                    alignItems: 'center',
                }}>
                <View style={{ rowGap: spacing.m, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowViewer(true, message.is_user)}>
                        <Avatar
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: borderRadius.xl,
                                marginLeft: spacing.sm,
                                marginRight: spacing.m,
                            }}
                            targetImage={Characters.getImageDir(
                                message.is_user ? userImageId : charImageId
                            )}
                        />
                    </TouchableOpacity>

                    <Text style={{ color: color.text._400 }}>#{index}</Text>
                    {deltaTime !== undefined && !message.is_user && index !== 0 && (
                        <Text style={{ color: color.text._400 }}>{deltaTime}s</Text>
                    )}
                </View>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <View style={{ marginBottom: spacing.m, alignItems: align }}>
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
