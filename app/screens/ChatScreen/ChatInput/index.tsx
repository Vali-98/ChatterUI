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
    // 🚀 GEMU EDITION: CHATGPT STYLE STATE
    // ==========================================
    const [showModifiers, setShowModifiers] = useState(false);
    const [activeMode, setActiveMode] = useState<string | null>(null);

    const getModeConfig = (mode: string | null) => {
        switch(mode) {
            case 'fix': return { icon: '🪄', name: 'Fix', color: '#00e676', bg: '#00e67620' };
            case 'logic': return { icon: '🧠', name: 'Logic', color: '#00b0ff', bg: '#00b0ff20' };
            case 'fun': return { icon: '🎨', name: 'Fun', color: '#ff4081', bg: '#ff408120' };
            case 'max': return { icon: '✨', name: 'Max', color: '#ffeb3b', bg: '#ffeb3b20' };
            default: return null;
        }
    }
    // ==========================================

    const abortResponse = async () => {
        Logger.info(`Aborting Generation`)
        if (abortFunction) await abortFunction()
    }

    const handleSend = async () => {
        if (newMessage.trim() === '' && attachments.length === 0) return;

        // 🚀 GEMU: Invisible C.R.E.A.T.E. Injection Engine!
        let finalMessage = newMessage;
        
        if (activeMode === 'fix') {
            finalMessage = "[System: Fix all grammar, spelling, and format this text beautifully.]\n\n" + finalMessage;
        } else if (activeMode === 'logic') {
            finalMessage = "[System: Answer with strict logic, step-by-step reasoning, and high accuracy. No fluff.]\n\n" + finalMessage;
        } else if (activeMode === 'fun') {
            finalMessage = "[System: Be highly creative, engaging, use emojis, and act like a fun persona!]\n\n" + finalMessage;
        } else if (activeMode === 'max') {
            // THE OFFLINE C.R.E.A.T.E. AUTO-ENHANCER!
            finalMessage = `[SYSTEM AUTO-ENHANCER ACTIVE]
You are an Elite AI Prompt Engineer. The user has provided a raw, quick prompt below. Ignore any spelling or grammar mistakes.
Instead of answering normally, internally upgrade this prompt using the C.R.E.A.T.E. formula before executing it:
- Character: Assume the role of a world-class expert on this topic.
- Request: Identify and flawlessly execute the core task.
- Example: Apply high-quality references and industry standards.
- Adjustments: Optimize the structure for maximum impact and engagement.
- Type of output: Format beautifully (use Markdown, tables, or bullets if it makes sense).
- Extra Guidance: Ensure zero hallucinations and make it easy to understand.

Now, execute the user's raw request using this elite C.R.E.A.T.E. framework:
` + finalMessage;
        }

        await addEntry(
            userName ?? '',
            true,
            finalMessage, // Send the invisibly enhanced C.R.E.A.T.E. message!
            attachments.map((item) => item.uri)
        )
        
        const swipeId = await addEntry(charName ?? '', false, '')
        
        setNewMessage('')
        setAttachments([])
        
        // Reset everything after sending
        setActiveMode(null);
        setShowModifiers(false);
        
        if (swipeId) generateResponse(swipeId)
    }

    const activeConfig = getModeConfig(activeMode);

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
                borderRadius: 24, // ChatGPT Pill Shape!
                rowGap: spacing.m,
            }}>
            
            {/* ========================================== */}
            {/* 🚀 GEMU EDITION: EXPANDABLE MENU           */}
            {/* ========================================== */}
            {showModifiers && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, paddingTop: 4 }}>
                    {['fix', 'logic', 'fun', 'max'].map((mode) => {
                        const config = getModeConfig(mode);
                        return (
                            <TouchableOpacity 
                                key={mode}
                                onPress={() => {
                                    setActiveMode(activeMode === mode ? null : mode);
                                    setShowModifiers(false); // Auto-hide menu on select!
                                }}
                                style={{ padding: 8, backgroundColor: '#2d2d2d', borderRadius: 16, flex: 1, marginHorizontal: 2, alignItems: 'center', borderWidth: 1, borderColor: activeMode === mode ? config?.color : 'transparent' }}>
                                <Text style={{ color: config?.color, fontWeight: 'bold', fontSize: 11 }}>{config?.icon} {config?.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            )}

            {/* ========================================== */}
            {/* 🚀 GEMU EDITION: CHATGPT ACTIVE PILL       */}
            {/* ========================================== */}
            {activeMode && !showModifiers && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={{ paddingHorizontal: spacing.m, paddingBottom: 2, paddingTop: 6 }}>
                    <TouchableOpacity 
                        onPress={() => setActiveMode(null)}
                        style={{
                            alignSelf: 'flex-start',
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: activeConfig?.bg,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: activeConfig?.color,
                        }}>
                        <Text style={{ color: activeConfig?.color, fontWeight: 'bold', fontSize: 12 }}>
                            {activeConfig?.icon} {activeConfig?.name}  ✕
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
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
                    alignItems: 'flex-end', // Aligns items to the bottom for multiline text!
                    columnGap: spacing.m,
                }}>
                <Animated.View layout={XAxisOnlyTransition}>
                    {!hideOptions && (
                        <Animated.View
                            entering={FadeIn}
                            exiting={FadeOut}
                            style={{ flexDirection: 'row', columnGap: 8, alignItems: 'center', paddingBottom: 8 }}>
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
                            
                            {/* 🚀 GEMU EDITION: THE SPARKLE TRIGGER BUTTON */}
                            <TouchableOpacity 
                                onPress={() => setShowModifiers(!showModifiers)} 
                                style={{ 
                                    padding: 6, 
                                    backgroundColor: showModifiers ? color.primary._600 : color.neutral._200, 
                                    borderRadius: 16 
                                }}>
                                <MaterialIcons 
                                    name="auto-awesome" 
                                    size={20} 
                                    color={showModifiers ? color.text._100 : color.text._400} 
                                />
                            </TouchableOpacity>

                        </Animated.View>
                    )}
                    {hideOptions && (
                        <Animated.View entering={FadeIn} exiting={FadeOut} style={{ paddingBottom: 8 }}>
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
                        borderWidth: 0, // Removed border for modern look!
                        borderRadius: borderRadius.l,
                        paddingHorizontal: spacing.m,
                        paddingTop: 12,
                        paddingBottom: 12,
                        maxHeight: 120, // Prevents box from getting too tall
                    }}
                    onPress={() => {
                        setHideOptions(!!newMessage)
                    }}
                    placeholder="Message..."
                    placeholderTextColor={color.text._600}
                    value={newMessage}
                    onChangeText={(text) => {
                        setHideOptions(!!text)
                        setNewMessage(text)
                    }}
                    multiline
                    submitBehavior={sendOnEnter ? 'blurAndSubmit' : 'newline'}
                    onSubmitEditing={sendOnEnter ? handleSend : undefined}
                />
                <Animated.View layout={XAxisOnlyTransition} style={{ paddingBottom: 6 }}>
                    <TouchableOpacity
                        style={{
                            borderRadius: 24,
                            backgroundColor: nowGenerating ? color.error._500 : (newMessage.trim() || attachments.length > 0) ? color.primary._500 : color.neutral._300,
                            padding: spacing.m,
                        }}
                        disabled={!nowGenerating && newMessage.trim() === '' && attachments.length === 0}
                        onPress={nowGenerating ? abortResponse : handleSend}>
                        <MaterialIcons
                            name={nowGenerating ? 'stop' : 'arrow-upward'} // ChatGPT style Up Arrow!
                            color={color.neutral._100}
                            size={20}
                        />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    )
}

export default ChatInput
