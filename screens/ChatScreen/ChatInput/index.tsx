import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { randomUUID } from 'expo-crypto'
import { Image } from 'expo-image'
import { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, Pressable, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, {
    BounceIn,
    FadeIn,
    FadeOut,
    LinearTransition,
    ZoomOut,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import IconButton from '@components/buttons/IconButton'
import AudioAttachment from '@components/media/AudioAttachment'
import AudioRecordingSheet from '@components/media/AudioRecordingSheet'
import Alert from '@components/views/Alert'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import CameraSheet from '@components/views/CameraSheet'
import ContextMenu from '@components/views/ContextMenu'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { XAxisOnlyTransition } from '@lib/animations/transitions'
import { useAudioAttachmentPicker } from '@lib/audio/useAudioAttachmentPicker'
import { AnimatedTextInput } from '@lib/components/AnimatedComponents'
import { AppSettings } from '@lib/constants/appSettings'
import { useChatGenerating, useCanStartGeneration } from '@lib/engine/generation/hooks'
import { abortGeneration } from '@lib/engine/generation/runtime'
import { submitMessage } from '@lib/engine/Inference'
import { useActiveProvider } from '@lib/hooks/ActiveProvider'
import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Chats } from '@lib/state/chat'
import { useChatControlLayoutState } from '@lib/state/components/ChatControls'
import { useChatInputTextStore } from '@lib/state/components/ChatInput'
import { Logger } from '@lib/state/Logger'
import { getContrastingColor, getShadowColor } from '@lib/theme/contrast'
import { Theme } from '@lib/theme/ThemeManager'

import ChatOptions from './ChatInputOptions'

export type Attachment = {
    uri: string
    type: 'image' | 'audio' | 'document'
    name: string
}

const ChatInput = () => {
    const { t } = useTranslation()
    const inputRef = useUnfocusTextInput()
    const { available: activeProvider, mode } = useActiveProvider()
    const { color, borderRadius, spacing } = Theme.useTheme()
    const [sendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [hideOptions, setHideOptions] = useState(false)
    const cameraSheetRef = useBottomSheetRef()
    const recordingSheetRef = useBottomSheetRef()
    const setHeight = useChatControlLayoutState((state) => state.setInputHeight)

    const { chatId } = Chats.useChat()
    const { pickAudio, isPreparingAudio } = useAudioAttachmentPicker(chatId, (selected) => {
        setAttachments((current) => [...current, ...selected])
    })
    const isGenerating = useChatGenerating(chatId)
    const canGenerate = useCanStartGeneration(chatId)

    const { newMessage, setNewMessage, clearSubmittedText } = useChatInputTextStore(
        useShallow((state) => ({
            newMessage: state.text,
            setNewMessage: state.setText,
            clearSubmittedText: state.clearSubmittedText,
        }))
    )

    const abortResponse = async () => {
        Logger.info(t('chat.input.errors.abortGeneration'))
        if (chatId !== undefined) await abortGeneration(chatId)
    }

    const handleSend = async () => {
        if (!chatId || !canGenerate || isPreparingAudio) return
        Keyboard.dismiss()
        try {
            const accepted = await submitMessage(chatId, {
                text: newMessage,
                attachmentUris: attachments.map((item) => item.uri),
            })
            if (accepted) {
                clearSubmittedText(chatId, newMessage)
                setAttachments((current) => current.filter((item) => !attachments.includes(item)))
            }
        } catch (error) {
            Logger.errorToast(t('chat.input.errors.failedToSend'))
            Logger.error(error)
        }
    }

    const handlePickImage = async () => {
        const permissionResult = await requestMediaLibraryPermissionsAsync()

        if (!permissionResult.granted) {
            Alert.alert({
                title: t('common.errors.permissionRequired'),
                description: t('chat.input.errors.permissionDescription'),
                buttons: [
                    {
                        label: t('common.actions.close'),
                    },
                ],
            })
            return
        }

        let result = await launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            aspect: [4, 3],
            quality: 1,
        })

        if (result.canceled) return

        const newAttachments = result.assets
            .map((item) => ({
                uri: item.uri,
                type: 'image',
                name: item.fileName,
            }))
            .filter((item) => !attachments.some((a) => a.name === item.name)) as Attachment[]

        return setAttachments([...attachments, ...newAttachments])
    }

    return (
        <Pressable
            onPress={() => {
                if (activeProvider) return
                if (mode === 'local') {
                    router.push('/models')
                } else router.push('/connections')
            }}
            onLayout={(e) => {
                setHeight(e.nativeEvent.layout.height)
            }}
            disabled={activeProvider}
            style={{
                position: 'absolute',
                width: '98%',
                alignSelf: 'center',
                bottom: 4,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                backgroundColor: color.neutral._100 + 'cc',
                borderWidth: 1,
                borderColor: color.neutral._200,
                boxShadow: [
                    {
                        offsetX: 1,
                        offsetY: 1,
                        color: getShadowColor(color.shadow),
                        spreadDistance: 1,
                        blurRadius: 4,
                    },
                ],
                borderRadius: 16,
                rowGap: spacing.m,
            }}>
            <Animated.FlatList
                itemLayoutAnimation={LinearTransition}
                style={{
                    display: attachments.length > 0 ? 'flex' : 'none',

                    backgroundColor: color.neutral._200,
                    borderRadius: borderRadius.m,
                }}
                horizontal
                contentContainerStyle={{ columnGap: spacing.xl, padding: spacing.l }}
                data={attachments}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => {
                    return (
                        <Animated.View
                            entering={BounceIn}
                            exiting={ZoomOut.duration(100)}
                            style={{ alignItems: 'center', rowGap: 8 }}>
                            {item.type === 'image' ? (
                                <Image
                                    source={{ uri: item.uri }}
                                    style={{
                                        width: 128,
                                        height: undefined,
                                        aspectRatio: 1,
                                        borderRadius: borderRadius.m,
                                        borderWidth: 1,
                                        borderColor: color.primary._500,
                                    }}
                                />
                            ) : (
                                <View style={{ width: 292, paddingRight: 32 }}>
                                    <AudioAttachment
                                        source={{
                                            uri: item.uri,
                                            name: item.name,
                                            chatId: chatId ?? -1,
                                        }}
                                    />
                                </View>
                            )}

                            <IconButton
                                iconName="close"
                                iconSize={16}
                                viewStyle={{
                                    position: 'absolute',
                                    top: 6,
                                    right: item.type === 'image' ? 6 : 0,
                                    paddingHorizontal: 5,
                                    paddingVertical: 5,
                                    borderRadius: borderRadius.xl3,
                                    borderWidth: 1,
                                    borderColor: color.neutral._400,
                                    backgroundColor: color.neutral._100,
                                }}
                                onPress={() => {
                                    setAttachments(attachments.filter((a) => a.uri !== item.uri))
                                }}
                            />
                        </Animated.View>
                    )
                }}
            />
            <AudioRecordingSheet
                ref={recordingSheetRef}
                chatId={chatId ?? -1}
                onAttach={(recording) => setAttachments((current) => [...current, recording])}
            />
            <CameraSheet
                onTakePicture={(picture) => {
                    setAttachments((attachments) => [
                        ...attachments,
                        {
                            name: randomUUID().toString(),
                            uri: picture.uri,
                            type: 'image',
                        },
                    ])
                }}
                ref={cameraSheetRef}
            />
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: spacing.m,
                }}>
                <Animated.View layout={XAxisOnlyTransition}>
                    {!hideOptions && (
                        <Animated.View
                            entering={FadeIn}
                            exiting={FadeOut}
                            style={{
                                flexDirection: 'row',
                                columnGap: 8,
                                alignItems: 'center',
                            }}>
                            <ChatOptions disabled={!activeProvider} />
                            <ContextMenu disabled={!activeProvider} placement="top">
                                <ContextMenu.Trigger
                                    icon="paper-clip"
                                    iconSize={20}
                                    iconStyle={{
                                        color: color.text._400,
                                        padding: 6,
                                        backgroundColor: color.neutral._200,
                                        borderRadius: 16,
                                        opacity: activeProvider ? 1 : 0.5,
                                    }}
                                />
                                <ContextMenu.Body>
                                    <ContextMenu.Button
                                        label={t('chat.input.actions.takePicture')}
                                        icon="camera"
                                        onPress={() => {
                                            cameraSheetRef.current?.open()
                                        }}
                                    />
                                    <ContextMenu.Button
                                        label={t('audio.record')}
                                        icon="audio"
                                        onPress={() => recordingSheetRef.current?.open()}
                                    />
                                    <ContextMenu.Button
                                        label={t('audio.add')}
                                        icon="sound"
                                        closeOnPress={false}
                                        onPress={async (close) => {
                                            close()
                                            try {
                                                await pickAudio()
                                            } catch (error) {
                                                Logger.errorToast(t('audio.addFailed'), error)
                                            }
                                        }}
                                    />
                                    <ContextMenu.Button
                                        label={t('chat.input.actions.addImage')}
                                        icon="picture"
                                        closeOnPress={false}
                                        onPress={async (close) => {
                                            close()
                                            handlePickImage()
                                        }}
                                    />
                                </ContextMenu.Body>
                            </ContextMenu>
                        </Animated.View>
                    )}
                    {hideOptions && (
                        <Animated.View entering={FadeIn} exiting={FadeOut}>
                            <IconButton
                                iconSize={18}
                                iconStyle={{
                                    color: color.text._400,
                                }}
                                viewStyle={{
                                    paddingHorizontal: 5,
                                    paddingVertical: 5,
                                    backgroundColor: color.neutral._200,
                                    borderRadius: 32,
                                }}
                                variant="tertiary"
                                iconName="right"
                                onPress={() => setHideOptions(false)}
                            />
                        </Animated.View>
                    )}
                </Animated.View>
                <AnimatedTextInput
                    layout={XAxisOnlyTransition}
                    ref={inputRef}
                    style={{
                        color: color.text._100,
                        backgroundColor: color.neutral._100,
                        flex: 1,
                        borderWidth: 2,
                        borderColor: activeProvider ? color.primary._300 : color.primary._100,
                        borderRadius: borderRadius.l,
                        paddingHorizontal: spacing.m,
                        paddingVertical: spacing.m,
                    }}
                    onPress={() => {
                        setHideOptions(!!newMessage)
                    }}
                    numberOfLines={8}
                    placeholder={
                        activeProvider
                            ? t('chat.input.message')
                            : mode === 'local'
                              ? t('chat.input.noModelLoaded')
                              : t('chat.input.noConnection')
                    }
                    editable={activeProvider}
                    placeholderTextColor={color.text._700}
                    value={newMessage}
                    onChangeText={(text) => {
                        setHideOptions(!!text)
                        setNewMessage(text)
                    }}
                    multiline
                    submitBehavior={
                        sendOnEnter ? (isPreparingAudio ? 'submit' : 'blurAndSubmit') : 'newline'
                    }
                    onSubmitEditing={sendOnEnter ? handleSend : undefined}
                />
                <Animated.View layout={XAxisOnlyTransition}>
                    <TouchableOpacity
                        disabled={
                            (isPreparingAudio && !isGenerating) ||
                            (!canGenerate && !isGenerating) ||
                            !chatId ||
                            (!activeProvider && !isGenerating)
                        }
                        style={{
                            borderRadius: borderRadius.m,
                            backgroundColor: !activeProvider
                                ? color.neutral._100
                                : isGenerating
                                  ? color.error._500
                                  : color.primary._500,
                            padding: spacing.s,
                            borderWidth: 2,
                            borderColor: !activeProvider
                                ? color.primary._100
                                : isGenerating
                                  ? color.error._500
                                  : color.primary._500,
                        }}
                        onPress={isGenerating ? abortResponse : handleSend}>
                        {isPreparingAudio && !isGenerating ? (
                            <ThemedSpinner
                                size={24}
                                color={getContrastingColor(color.primary._500)}
                            />
                        ) : (
                            <MaterialIcons
                                name={isGenerating ? 'stop' : 'send'}
                                color={
                                    isGenerating
                                        ? '#111111'
                                        : activeProvider
                                          ? getContrastingColor(color.primary._500)
                                          : color.text._700
                                }
                                size={24}
                            />
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Pressable>
    )
}

export default ChatInput
