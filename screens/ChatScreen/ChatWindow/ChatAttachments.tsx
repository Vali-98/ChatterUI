import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, Pressable, View } from 'react-native'

import AttachmentViewer from '@components/media/AttachmentViewer'
import AudioAttachment from '@components/media/AudioAttachment'
import ScaledImage from '@components/views/ScaledImage'
import { ChatMessage } from '@lib/state/chat'

type ChatAttachmentsProps = {
    entry: ChatMessage
}

const ChatAttachments: React.FC<ChatAttachmentsProps> = ({ entry }) => {
    const { t } = useTranslation()
    const [viewerIndex, setViewerIndex] = useState<number>()
    if (entry.attachments.length < 1) return
    const images = entry.attachments.filter((item) => item.type === 'image')
    const audio = entry.attachments.filter((item) => item.type === 'audio')
    return (
        <View style={{ rowGap: 8 }}>
            {viewerIndex !== undefined && (
                <AttachmentViewer
                    images={images}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(undefined)}
                />
            )}
            {audio.map((item) => (
                <AudioAttachment
                    key={item.id}
                    source={{
                        uri: item.uri,
                        name: item.name,
                        chatId: entry.chat_id,
                        messageId: entry.id,
                    }}
                />
            ))}
            {images.length > 0 && (
                <View
                    style={{
                        paddingVertical: 4,
                        rowGap: 8,
                        columnGap: 8,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}>
                    {images.map((item, index) => (
                        <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            accessibilityLabel={t('chat.attachments.view', { name: item.name })}
                            onPress={(event) => {
                                event.stopPropagation()
                                setViewerIndex(index)
                            }}>
                            <ScaledImage
                                cachePolicy="none"
                                key={item.uri}
                                uri={item.uri}
                                style={{
                                    height: Dimensions.get('window').height / 8,
                                    borderRadius: 8,
                                }}
                            />
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    )
}

export default ChatAttachments
