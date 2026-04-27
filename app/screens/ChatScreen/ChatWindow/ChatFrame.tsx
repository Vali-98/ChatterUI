import { ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import Avatar from '@components/views/Avatar'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { useAvatarViewerStore } from '@lib/state/components/AvatarViewer'
import { Theme } from '@lib/theme/ThemeManager'
import { ChatSwipe } from 'db/schema'

type ChatFrameProps = {
    children?: ReactNode
    index: number
    entry: Chats.db.live.LiveEntry
    swipe: ChatSwipe
    nowGenerating: boolean
    isLast?: boolean
}

const ChatFrame: React.FC<ChatFrameProps> = ({
    children,
    index,
    nowGenerating,
    isLast,
    entry,
    swipe,
}) => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    const [wide] = useMMKVBoolean(AppSettings.WideChatMode)
    const [alternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)

    const setShowViewer = useAvatarViewerStore((state) => state.setShow)
    const charImageId = Characters.useCharacterStore((state) => state.card?.image_id) ?? 0
    const userImageId = Characters.useUserStore((state) => state.card?.image_id) ?? 0

    if (!swipe) return

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

    const rowDir = entry.is_user && alternate ? 'row-reverse' : 'row'
    const align = entry.is_user && alternate ? 'flex-end' : 'flex-start'
    if (wide)
        return (
            <View
                style={{
                    flex: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: color.neutral._100 + 'bb',
                }}>
                <View
                    style={{
                        flexDirection: rowDir,
                        alignItems: 'center',
                        marginBottom: spacing.l,
                    }}>
                    <TouchableOpacity onPress={() => setShowViewer(true, entry.is_user)}>
                        <Avatar
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: borderRadius.xl,
                                marginRight: entry.is_user && alternate ? 0 : spacing.l,
                                marginLeft: entry.is_user && alternate ? spacing.l : 0,
                            }}
                            targetImage={Characters.getImageDir(
                                entry.is_user ? userImageId : charImageId
                            )}
                        />
                    </TouchableOpacity>
                    <View style={{ alignItems: align }}>
                        <Text
                            style={{
                                fontSize: fontSize.l,
                                color: color.text._100,
                            }}>
                            {entry.name}
                        </Text>
                        <View style={{ columnGap: 12, flexDirection: rowDir }}>
                            <Text style={{ fontSize: fontSize.s, color: color.text._400 }}>
                                {swipe.gen_finished.toLocaleTimeString()}
                            </Text>
                            <Text style={{ color: color.text._700, fontSize: fontSize.s }}>
                                #{index}
                            </Text>
                            {deltaTime !== undefined && !entry.is_user && index !== 0 && (
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
                    <TouchableOpacity onPress={() => setShowViewer(true, entry.is_user)}>
                        <Avatar
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: borderRadius.xl,
                                marginLeft: spacing.sm,
                                marginRight: spacing.m,
                            }}
                            targetImage={Characters.getImageDir(
                                entry.is_user ? userImageId : charImageId
                            )}
                        />
                    </TouchableOpacity>

                    <Text style={{ color: color.text._400 }}>#{index}</Text>
                    {deltaTime !== undefined && !entry.is_user && index !== 0 && (
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
                            {entry.name}
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
