import ThemedButton from '@components/buttons/ThemedButton'
import PopupMenu from '@components/views/PopupMenu'
import { MaterialIcons } from '@expo/vector-icons'
import { XAxisOnlyTransition } from '@lib/animations/transitions'
import { AppSettings } from '@lib/constants/GlobalValues'
import { generateResponse } from '@lib/engine/Inference'
import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getDocumentAsync } from 'expo-document-picker'
import { Image } from 'expo-image'
import React, { useState } from 'react'
import { TextInput, TouchableOpacity, View, Text } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, {
    BounceIn,
    FadeIn,
    FadeOut,
    LinearTransition,
    ZoomOut,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import ChatOptions from './ChatInputOptions'

export type Attachment = {
    uri: string
    type: 'image' | 'audio' | 'document'
    name: string
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

type ChatInputHeightStoreProps = {
    height: number
    setHeight: (n: number) => void
}

export const useInputHeightStore = create<ChatInputHeightStoreProps>()((set) => ({
    height: 54,
    setHeight: (n) => set({ height: Math.ceil(n) }),
}))

const ChatInput = () => {
    const insets = useSafeAreaInsets()
    const inputRef = useUnfocusTextInput()

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
    const setHeight = useInputHeightStore(useShallow((state) => state.setHeight))

    const { charName } = Characters.useCharacterStore(
        useShallow((state) => ({
            charName: state?.card?.name,
        }))
    )

    const { userName } = Characters.useUserStore(
        useShallow((state) => ({ userName: state.card?.name }))
    )

    const [newMessage, setNewMessage] = useState<string>('')

    // ==========================================
    // 🚀 GEMU EDITION: INVISIBLE TOGGLE STATES
    // ==========================================
    const [isFixOn, setIsFixOn] = useState(false);
    const [isLogicOn, setIsLogicOn] = useState(false);
    const [isFunOn, setIsFunOn] = useState(false);
    const [isMaxOn, setIsMaxOn] = useState(false);

    // This ensures only ONE button can be active at a time!
    const toggleMode = (mode: string) => {
        setIsFixOn(mode === 'fix' ? !isFixOn : false);
        setIsLogicOn(mode === 'logic' ? !isLogicOn : false);
        setIsFunOn(mode === 'fun' ? !isFunOn : false);
        setIsMaxOn(mode === 'max' ? !isMaxOn : false);
    };

    const handleVoiceInput = () => {
        Logger.infoToast("🎙️ Voice module requires native Microphone permissions first!");
    };
    // ==========================================

    const abortResponse = async () => {
        Logger.info(`Aborting Generation`)
        if (abortFunction) await abortFunction()
    }

    const handleSend = async () => {
        if (newMessage.trim() === '' && attachments.length === 0) return;

        // 🚀 GEMU: Invisible Injection Engine!
        // This attaches the instructions in the background, never ruining your text box.
        let finalMessage = newMessage;
        
        if (isFixOn) {
            finalMessage = "[System: Fix all grammar, spelling, and format this text beautifully.]\n\n" + finalMessage;
        } else if (isLogicOn) {
            finalMessage = "[System: Answer with strict logic, step-by-step reasoning, and high accuracy. No fluff.]\n\n" + finalMessage;
        } else if (isFunOn) {
            finalMessage = "[System: Be highly creative, engaging, use emojis, and act like a fun persona!]\n\n" + finalMessage;
        } else if (isMaxOn) {
            finalMessage = "[System: Expand this short idea into a highly detailed and complex prompt.]\n\n" + finalMessage;
        }

        await addEntry(
            userName ?? '',
            true,
            finalMessage, // Send the invisibly modified message!
            attachments.map((item) => item.uri)
        )
        
        const swipeId = await addEntry(charName ?? '', false, '')
        
        // Clear the text box
        setNewMessage('')
        setAttachments([])
        
        // Turn all toggles off after sending
        setIsFixOn(false);
        setIsLogicOn(false);
        setIsFunOn(false);
        setIsMaxOn(false);
        
        if (swipeId) generateResponse(swipeId)
    }

    return (
        <View
            onLayout={(e) => {
                setHeight(e.nativeEvent.layout.height)
            }}
            style={{
                position: 'absolute',
                width: '98%',
                alignSelf: 'center',
                bottom: insets.bottom,
                marginVertical: spacing.m,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.sm,
                backgroundColor: color.neutral._100 + 'cc',
                borderWidth: 1,
                borderColor: color.neutral._200,
                boxShadow: [
                    {
                        offsetX: 1,
                        offsetY: 1,
                        color: color.shadow,
                        spreadDistance: 1,
                        blurRadius: 4,
                    },
                ],
                borderRadius: 16,
                rowGap: spacing.m,
            }}>
            
            {/* ========================================== */}
            {/* 🚀 GEMU EDITION: THE SMART TOGGLE ROW UI   */}
            {/* ========================================== */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
                <TouchableOpacity onPress={handleVoiceInput} style={{ padding: 6, backgroundColor: '#d32f2f', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>🎙️ Voice</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggleMode('fix')} style={{ padding: 6, backgroundColor: isFixOn ? '#00e676' : '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
                    <Text style={{ color: isFixOn ? '#000000' : '#00e676', fontWeight: 'bold', fontSize: 11 }}>🪄 Fix</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => toggleMode('logic')} style={{ padding: 6, backgroundColor: isLogicOn ? '#00b0ff' : '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
                    <Text style={{ color: isLogicOn ? '#000000' : '#00b0ff', fontWeight: 'bold', fontSize: 11 }}>🧠 Logic</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggleMode('fun')} style={{ padding: 6, backgroundColor: isFunOn ? '#ff4081' : '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
                    <Text style={{ color: isFunOn ? '#000000' : '#ff4081', fontWeight: 'bold', fontSize: 11 }}>🎨 Fun</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggleMode('max')} style={{ padding: 6, backgroundColor: isMaxOn ? '#ffeb3b' : '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
                    <Text style={{ color: isMaxOn ? '#000000' : '#ffeb3b', fontWeight: 'bold', fontSize: 11 }}>✨ Max</Text>
                </TouchableOpacity>
            </View>
            {/* ========================================== */}

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
                            <ChatOptions />
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
                                iconSize={18}
                                iconStyle={{
                                    color: color.text._400,
                                }}
                                buttonStyle={{
                                    padding: 5,
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
                <Animated.View layout={XAxisOnlyTransition}>
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
                </Animated.View>
            </View>
        </View>
    )
}

export default ChatInput
