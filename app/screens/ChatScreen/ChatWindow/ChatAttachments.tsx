import ScaledImage from '@components/views/ScaledImage'
import { Chats } from '@lib/state/Chat'
import { Dimensions, View } from 'react-native'

type ChatAttachmentsProps = {
    index: number
}

const ChatAttachments: React.FC<ChatAttachmentsProps> = ({ index }) => {
    const message = Chats.useEntryData(index)

    if (message.attachments.length < 1) return
    const images = message.attachments.filter((item) => item.type === 'image')
    const audio = message.attachments.filter((item) => item.type === 'audio')
    const documents = message.attachments.filter((item) => item.type === 'document')
    return (
        <View style={{ rowGap: 8 }}>
            {images.length > 0 && (
                <View
                    style={{
                        paddingVertical: 4,
                        rowGap: 8,
                        columnGap: 8,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}>
                    {images.map((item) => (
                        <ScaledImage
                            cachePolicy="none"
                            key={item.uri}
                            uri={item.uri}
                            style={{ height: Dimensions.get('window').height / 8, borderRadius: 8 }}
                        />
                    ))}
                </View>
            )}
        </View>
    )
}

export default ChatAttachments
