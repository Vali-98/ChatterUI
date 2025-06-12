import ThemedButton from '@components/buttons/ThemedButton'
import PopupMenu from '@components/views/PopupMenu'
import { MaterialIcons } from '@expo/vector-icons'
import { AppSettings } from '@lib/constants/GlobalValues'
import { generateResponse } from '@lib/engine/Inference'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getDocumentAsync } from 'expo-document-picker'
import { Image } from 'expo-image'
import React, { useState } from 'react'
import { TextInput, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, {
    BounceIn,
    FadeIn,
    FadeOut,
    LayoutAnimationsValues,
    LinearTransition,
    SlideInLeft,
    withDelay,
    withSpring,
    withTiming,
    ZoomOut,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'
import OptionsMenu from './OptionsMenu'

export type Attachment = {
    uri: string
    type: 'image' | 'audio' | 'document'
    name: string
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

const ChatInput = () => {
    const { color, borderRadius, spacing } = Theme.useTheme()
    const [sendOnEnter, _] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [hideOptions, setHideOptions] = useState(false)
    const { addEntry } = Chats.useEntry()
    const { nowGenerating, abortFunction } = useInference(
        useShallow((state) => ({
            nowGenerating: state.nowGenerating,
            abortFunction: state.abortFunction,
        }))
    )

    const { charName } = Characters.useCharacterCard(
        useShallow((state) => ({
            charName: state?.card?.name,
        }))
    )

    const { userName } = Characters.useUserCard(
        useShallow((state) => ({ userName: state.card?.name }))
    )

    const [newMessage, setNewMessage] = useState<string>('')

    const abortResponse = async () => {
        Logger.info(`Aborting Generation`)
        if (abortFunction) await abortFunction()
    }

    const handleSend = async () => {
        if (newMessage.trim() !== '' || attachments.length > 0)
            await addEntry(
                userName ?? '',
                true,
                newMessage,
                attachments.map((item) => item.uri)
            )
        const swipeId = await addEntry(charName ?? '', false, '')
        setNewMessage('')
        setAttachments([])
        if (swipeId) generateResponse(swipeId)
    }

    return (
        <View
            style={{
                paddingHorizontal: spacing.l,
                paddingVertical: spacing.l,
                rowGap: spacing.m,
            }}>
            <Animated.FlatList
                itemLayoutAnimation={LinearTransition}
                style={{
                    display: attachments.length > 0 ? 'flex' : 'none',
                    padding: spacing.l,
                    backgroundColor: color.neutral._200,
                    borderRadius: borderRadius.m,
                }}
                horizontal
                contentContainerStyle={{ columnGap: spacing.xl }}
                data={attachments}
                keyExtractor={(item) => item.uri}
                renderItem={({ item }) => {
                    return (
                        <Animated.View
                            entering={BounceIn}
                            exiting={ZoomOut.duration(100)}
                            style={{ alignItems: 'center', maxWidth: 80, rowGap: 8 }}>
                            <Image
                                source={{ uri: item.uri }}
                                style={{
                                    width: 64,
                                    height: undefined,
                                    aspectRatio: 1,
                                    borderRadius: borderRadius.m,
                                    borderWidth: 1,
                                    borderColor: color.primary._500,
                                }}
                            />

                            <ThemedButton
                                iconName="close"
                                iconSize={20}
                                buttonStyle={{
                                    borderWidth: 0,
                                    paddingHorizontal: 2,
                                    paddingVertical: 2,
                                    position: 'absolute',
                                    alignSelf: 'flex-end',
                                    margin: -4,
                                }}
                                onPress={() => {
                                    setAttachments(attachments.filter((a) => a.uri !== item.uri))
                                }}
                            />
                        </Animated.View>
                    )
                }}
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
                            style={{ flexDirection: 'row', columnGap: 8, alignItems: 'center' }}>
                            <OptionsMenu />
                            <PopupMenu
                                icon="paperclip"
                                iconSize={20}
                                options={[
                                    {
                                        label: 'Add Image',
                                        icon: 'picture',
                                        onPress: async (menuRef) => {
                                            menuRef.current?.close()
                                            const result = await getDocumentAsync({
                                                type: 'image/*',
                                                multiple: true,
                                                copyToCacheDirectory: true,
                                            })
                                            if (result.canceled || result.assets.length < 1) return

                                            const newAttachments = result.assets
                                                .map((item) => ({
                                                    uri: item.uri,
                                                    type: 'image',
                                                    name: item.name,
                                                }))
                                                .filter(
                                                    (item) =>
                                                        !attachments.some(
                                                            (a) => a.name === item.name
                                                        )
                                                ) as Attachment[]
                                            setAttachments([...attachments, ...newAttachments])
                                        },
                                    },
                                ]}
                                style={{
                                    color: color.text._400,
                                    padding: 6,
                                    backgroundColor: color.neutral._200,
                                    borderRadius: 16,
                                }}
                                placement="top"
                            />
                        </Animated.View>
                    )}
                    {hideOptions && (
                        <Animated.View entering={FadeIn} exiting={FadeOut}>
                            <ThemedButton
                                iconSize={20}
                                iconStyle={{
                                    color: color.text._400,
                                }}
                                buttonStyle={{
                                    padding: 2,
                                    backgroundColor: color.neutral._200,
                                    borderRadius: 16,
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
                    style={{
                        color: color.text._100,
                        backgroundColor: color.neutral._100,
                        flex: 1,
                        borderWidth: 2,
                        borderColor: color.primary._300,
                        borderRadius: borderRadius.l,
                        paddingHorizontal: spacing.m,
                        paddingVertical: spacing.m,
                    }}
                    onPress={() => {
                        setHideOptions(!!newMessage)
                    }}
                    numberOfLines={6}
                    placeholder="Message..."
                    placeholderTextColor={color.text._700}
                    value={newMessage}
                    onChangeText={(text) => {
                        setHideOptions(!!text)
                        setNewMessage(text)
                    }}
                    multiline
                    submitBehavior={sendOnEnter ? 'blurAndSubmit' : 'newline'}
                    onSubmitEditing={sendOnEnter ? handleSend : undefined}
                />
                <TouchableOpacity
                    style={{
                        borderRadius: borderRadius.m,
                        backgroundColor: nowGenerating ? color.error._500 : color.primary._500,
                        padding: spacing.m,
                    }}
                    onPress={nowGenerating ? abortResponse : handleSend}>
                    <MaterialIcons
                        name={nowGenerating ? 'stop' : 'send'}
                        color={color.neutral._100}
                        size={24}
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default ChatInput

const XAxisOnlyTransition = (values: LayoutAnimationsValues) => {
    'worklet'
    return {
        animations: {
            originX: withTiming(values.targetOriginX),
            width: withTiming(values.targetWidth),
        },

        initialValues: {
            originX: values.currentOriginX,
            width: values.currentWidth,
        },
    }
}
