import AntDesign from '@react-native-vector-icons/ant-design/static'
import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { ImageBackground } from 'expo-image'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import TText from '@components/text/TText'
import { useChatBubbleStyle } from '@lib/hooks/useChatBubbleStyle'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Characters } from '@lib/state/characters'
import type { ChatMessage } from '@lib/state/chat'
import { Theme } from '@lib/theme/ThemeManager'
import { AppDirectory } from '@lib/utils/File'
import ChatFrame from '@screens/ChatScreen/ChatWindow/ChatFrame'
import ChatText from '@screens/ChatScreen/ChatWindow/ChatText'

const previewDate = new Date(2025, 0, 1, 10, 24)
const previewEntry = (id: number, isUser: boolean, name: string, content: string): ChatMessage => ({
    id: id,
    chat_id: -1,
    name: name,
    is_user: isUser,
    order: 0,
    swipe_id: 0,
    attachments: [],
    swipes: [
        {
            id: id,
            entry_id: id,
            swipe: content,
            active: true,
            send_date: previewDate,
            gen_started: previewDate,
            gen_finished: previewDate,
            timings: null,
            token_length: null,
            reset_length: null,
        },
    ],
})

const ChatAppearancePreview = ({
    characterBackground = false,
}: {
    characterBackground?: boolean
}) => {
    const { t } = useTranslation()
    const { color, spacing, borderRadius } = Theme.useTheme()
    const bubbleStyle = useChatBubbleStyle()
    const image = useBackgroundStore((state) => state.image)
    const characterName = Characters.useCharacterState((state) => state.card?.name)
    const characterImage = Characters.useCharacterState((state) => state.card?.background_image)
    const userName = Characters.useUserStore((state) => state.card?.name)
    const entries = [
        previewEntry(
            -100,
            true,
            userName ?? t('settings.appearance.previewUser'),
            t('settings.appearance.previewQuestion')
        ),
        previewEntry(
            -101,
            false,
            characterName ?? t('settings.appearance.previewCharacter'),
            t('settings.appearance.previewAnswer')
        ),
    ]
    const uri =
        characterBackground && characterImage
            ? Characters.getCardImageUri(characterImage)
            : image
              ? AppDirectory.Assets + image
              : undefined
    return (
        <View
            style={{
                padding: 8,
                borderRadius: 16,
                backgroundColor: color.neutral._100,
            }}>
            <TText color="400">
                {t('settings.appearance.preview')} · {color.name}
            </TText>
            <ImageBackground
                source={uri ? { uri } : undefined}
                cachePolicy="none"
                style={{
                    backgroundColor: color.neutral._100,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: color.neutral._300,
                }}>
                <View style={{ padding: 8 }}>
                    <View pointerEvents="none" style={{ rowGap: 12 }}>
                        {entries.map((entry, index) => (
                            <ChatFrame
                                key={entry.id}
                                entry={entry}
                                index={index + 1}
                                isGenerating={false}>
                                <View style={bubbleStyle}>
                                    <ChatText swipeText={entry.swipes[0].swipe} />
                                </View>
                            </ChatFrame>
                        ))}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                columnGap: spacing.m,
                                padding: spacing.sm,
                                backgroundColor: color.neutral._100 + 'cc',
                                borderWidth: 1,
                                borderColor: color.neutral._200,
                                borderRadius: 16,
                                boxShadow: [
                                    {
                                        offsetX: 1,
                                        offsetY: 1,
                                        color: color.shadow,
                                        spreadDistance: 1,
                                        blurRadius: 4,
                                    },
                                ],
                            }}>
                            <AntDesign name="caret-up" size={24} color={color.text._400} />
                            <AntDesign
                                name="paper-clip"
                                size={20}
                                color={color.text._400}
                                style={{
                                    padding: 6,
                                    backgroundColor: color.neutral._200,
                                    borderRadius: 16,
                                }}
                            />
                            <View
                                style={{
                                    flex: 1,
                                    borderWidth: 2,
                                    borderColor: color.primary._300,
                                    backgroundColor: color.neutral._100,
                                    borderRadius: borderRadius.l,
                                    padding: spacing.m,
                                }}>
                                <TText color="700">{t('settings.appearance.previewInput')}</TText>
                            </View>
                            <View
                                style={{
                                    padding: spacing.s,
                                    borderWidth: 2,
                                    borderColor: color.primary._500,
                                    backgroundColor: color.primary._500,
                                    borderRadius: borderRadius.m,
                                }}>
                                <MaterialIcons name="send" size={24} color={color.neutral._100} />
                            </View>
                        </View>
                    </View>
                </View>
            </ImageBackground>
        </View>
    )
}

export default ChatAppearancePreview
