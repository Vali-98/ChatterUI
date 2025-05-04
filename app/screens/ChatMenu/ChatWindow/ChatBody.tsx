import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import { useChatEditorState } from './EditorModal'
import Swipes from './Swipes'
import TTS from './TTS'
import ThemedButton from '@components/buttons/ThemedButton'
import { setStringAsync } from 'expo-clipboard'
import { Logger } from '@lib/state/Logger'

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}
const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/

const ChatBody: React.FC<ChatTextProps> = ({ index, nowGenerating, isLastMessage, isGreeting }) => {
    const message = Chats.useEntryData(index)
    const { appMode } = useAppMode()
    const [showTPS, __] = useMMKVBoolean(AppSettings.ShowTokenPerSecond)
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    const showEditor = useChatEditorState((state) => state.show)
    const handleEnableEdit = () => {
        if (!nowGenerating) showEditor(index)
    }
    const swipe = message.swipes[message.swipe_id].swipe
    const code = swipe.match(codeBlockRegex)
    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)
    const timings = message.swipes[message.swipe_id].timings
    return (
        <View>
            <TouchableOpacity
                style={{
                    backgroundColor: color.neutral._200,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.m,
                    minHeight: 40,
                    borderRadius: borderRadius.m,
                    shadowColor: color.shadow,
                    elevation: 2,
                }}
                activeOpacity={0.7}
                onLongPress={handleEnableEdit}>
                {isLastMessage ? (
                    <ChatTextLast nowGenerating={nowGenerating} index={index} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} index={index} />
                )}
                <View
                    style={{
                        flexDirection: 'row-reverse',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                    <View style={{ flexDirection: 'row', columnGap: 8, alignItems: 'center' }}>
                        {!(isLastMessage && nowGenerating) && (
                            <>
                                <ThemedButton
                                    variant="tertiary"
                                    iconName="copy1"
                                    iconSize={16}
                                    iconStyle={{
                                        color: color.text._500,
                                    }}
                                    onPress={() => {
                                        setStringAsync(swipe)
                                            .then(() => {
                                                Logger.infoToast('Copied')
                                            })
                                            .catch(() => {
                                                Logger.errorToast('Failed to copy to clipboard')
                                            })
                                    }}
                                />

                                {code && (
                                    <ThemedButton
                                        variant="tertiary"
                                        iconName="codesquareo"
                                        iconSize={16}
                                        iconStyle={{
                                            color: color.text._500,
                                        }}
                                        onPress={() => {
                                            if (code[1])
                                                setStringAsync(code[1])
                                                    .then(() => {
                                                        Logger.infoToast('Copied')
                                                    })
                                                    .catch(() => {
                                                        Logger.errorToast(
                                                            'Failed to copy to clipboard'
                                                        )
                                                    })
                                        }}
                                    />
                                )}
                            </>
                        )}
                        <TTS index={index} />
                    </View>
                    {showTPS && appMode === 'local' && timings && (
                        <Text
                            style={{
                                color: color.text._500,
                                fontWeight: '300',
                                textAlign: 'right',
                                fontSize: fontSize.s,
                            }}>
                            {`Prompt: ${getFiniteValue(timings.prompt_per_second)} t/s`}
                            {`   Text Gen: ${getFiniteValue(timings.predicted_per_second)} t/s`}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
            {showSwipe && (
                <Swipes index={index} nowGenerating={nowGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

const getFiniteValue = (value: number | null) => {
    if (!value || !isFinite(value)) return (0).toFixed(2)
    return value.toFixed(2)
}

export default ChatBody
