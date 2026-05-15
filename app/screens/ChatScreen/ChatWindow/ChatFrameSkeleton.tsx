import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'

type ChatFrameSkeletonProps = {
    index: number
    isUser?: boolean
    estimatedHeight?: number
    isLastMessage: boolean
}

const ChatFrameSkeleton: React.FC<ChatFrameSkeletonProps> = ({
    index,
    isUser = false,
    estimatedHeight = 48,
    isLastMessage,
}) => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    const [wide] = useMMKVBoolean(AppSettings.WideChatMode)
    const [alternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)

    const rowDir = isUser && alternate ? 'row-reverse' : 'row'
    const align = isUser && alternate ? 'flex-end' : 'flex-start'

    const skeletonColor = color.neutral._300 + '33'

    if (wide) {
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
                    <View
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: borderRadius.xl,
                            marginLeft: spacing.sm,
                            marginRight: spacing.m,
                            opacity: 0.5,
                            backgroundColor: skeletonColor,
                        }}
                    />

                    <View style={{ alignItems: align, rowGap: spacing.xs }}>
                        <View
                            style={{
                                width: 120,
                                height: 24,
                                borderRadius: 8,
                                backgroundColor: skeletonColor,
                            }}
                        />

                        <View
                            style={{
                                width: 100,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: skeletonColor,
                            }}
                        />
                    </View>
                </View>

                <View
                    style={{
                        width: '100%',
                        height: estimatedHeight,
                        borderRadius: 8,
                        backgroundColor: skeletonColor,
                    }}
                />
                {isLastMessage && (
                    <View
                        style={{
                            marginTop: 8,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: skeletonColor,
                            marginHorizontal: 32,
                        }}
                    />
                )}
            </View>
        )
    }

    return (
        <View style={{ flexDirection: rowDir, marginBottom: 8 }}>
            <View
                style={{
                    alignItems: 'center',
                }}>
                <View style={{ rowGap: spacing.m, alignItems: 'center' }}>
                    <View
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: borderRadius.xl,
                            marginLeft: spacing.sm,
                            marginRight: spacing.m,
                            opacity: 0.5,
                            backgroundColor: skeletonColor,
                        }}
                    />

                    <View
                        style={{
                            width: 32,
                            height: 12,
                            borderRadius: 8,
                            backgroundColor: skeletonColor,
                        }}
                    />

                    {index !== 0 && (
                        <View
                            style={{
                                width: 48,
                                height: 12,
                                borderRadius: 8,
                                backgroundColor: skeletonColor,
                            }}
                        />
                    )}
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <View
                        style={{
                            marginBottom: spacing.m,
                            alignItems: align,
                            rowGap: spacing.xs,
                        }}>
                        <View
                            style={{
                                width: 100,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: skeletonColor,
                                marginRight: spacing.sm,
                            }}
                        />

                        <View
                            style={{
                                width: 80,
                                height: 12,
                                borderRadius: 8,
                                backgroundColor: skeletonColor,
                            }}
                        />
                    </View>
                </View>

                <View
                    style={{
                        width: '100%',
                        height: estimatedHeight,
                        borderRadius: 8,
                        backgroundColor: skeletonColor,
                    }}
                />
                {isLastMessage && (
                    <View
                        style={{
                            marginTop: 8,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: skeletonColor,
                        }}
                    />
                )}
            </View>
        </View>
    )
}

export default ChatFrameSkeleton
