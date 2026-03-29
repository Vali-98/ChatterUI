import ThemedButton from '@components/buttons/ThemedButton'
import FadeBackrop from '@components/views/FadeBackdrop'
import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useState } from 'react'
// 🚀 GEMU FIX: ADDED TouchableOpacity TO THE IMPORT LIST SO THE APP DOESN'T CRASH!
import { GestureResponderEvent, Modal, StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native'
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller'
import Animated, { SlideOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type ChatEditorStateProps = {
    index: number
    editMode: boolean
    hide: () => void
    show: (index: number) => void
}

export const useChatEditorStore = create<ChatEditorStateProps>()((set) => ({
    index: 0,
    editMode: false,
    hide: () => {
        set((state) => ({ ...state, editMode: false }))
    },
    show: (index) => {
        set((state) => ({ ...state, editMode: true, index: index }))
    },
}))

const ChatEditor = () => {
    const { index, editMode, hide } = useChatEditorStore(
        useShallow((state) => ({
            index: state.index,
            editMode: state.editMode,
            hide: state.hide,
        }))
    )
    const styles = useStyles()
    const inputRef = useUnfocusTextInput()

    const { updateEntry, deleteEntry } = Chats.useEntry()
    const { swipeText, swipe } = Chats.useSwipeData(index)
    const entry = Chats.useEntryData(index)
    const [placeholderText, setPlaceholderText] = useState('')
    const insets = useSafeAreaInsets()
    const keyboardState = useKeyboardState()
    const bottomPad = keyboardState.isVisible ? 0 : insets.bottom
    useEffect(() => {
        editMode && swipeText !== undefined && setPlaceholderText(swipeText)
    }, [swipeText, editMode])

    if (swipeText === undefined) return

    const handleEditMessage = () => {
        hide()
        updateEntry(index, placeholderText)
    }

    const handleDeleteMessage = () => {
        hide()
        deleteEntry(index)
    }

    const handleClose = () => {
        hide()
    }

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) handleClose()
    }

    const handleAutoFocus = () => {
        setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.setSelection(placeholderText.length, placeholderText.length)
        }, 1)
    }
    
  // ==========================================
  // 🚀 GEMU EDITION: OFFLINE PROMPT ENHANCER
  // ==========================================
  const handleEnhancePrompt = async () => {
    if (!placeholderText || placeholderText.trim() === '') return; 
    const originalText = placeholderText;
    setPlaceholderText("✨ Enhancing prompt offline...");
    try {
      const finalEnhancedText = `[System: Expand this idea into a detailed prompt] -> ${originalText}`;
      setPlaceholderText(finalEnhancedText);
    } catch (error) {
      setPlaceholderText(originalText);
    }
  };

  // ==========================================
  // 🚀 GEMU EDITION: MOOD & FORMAT PRESETS
  // ==========================================
  const handleFormatText = () => {
    if (!placeholderText || placeholderText.trim() === '') return;
    setPlaceholderText(`[System: Fix all grammar, spelling, and format this text beautifully] -> ${placeholderText}`);
  };

  const handleLogicMode = () => {
    if (!placeholderText || placeholderText.trim() === '') return;
    setPlaceholderText(`[System: Answer with strict logic, step-by-step reasoning, and high accuracy. No fluff.] -> ${placeholderText}`);
  };

  const handleCreativeMode = () => {
    if (!placeholderText || placeholderText.trim() === '') return;
    setPlaceholderText(`[System: Be highly creative, engaging, use emojis, and act like a fun persona!] -> ${placeholderText}`);
  };
  // ==========================================

    return (
        <Modal
            visible={editMode}
            animationType="fade"
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onShow={handleAutoFocus}
            onRequestClose={handleClose}
            style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
                keyboardVerticalOffset={-insets.bottom}>
                <FadeBackrop handleOverlayClick={handleOverlayClick} />
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1 }} />
                    <Animated.View
                        exiting={SlideOutDown.duration(100)}
                        style={styles.editorContainer}>
                        <View style={styles.topText}>
                            <Text numberOfLines={1} style={styles.nameText} ellipsizeMode="tail">
                                {entry?.name}
                            </Text>
                            <Text style={styles.timeText}>
                                {swipe?.send_date.toLocaleTimeString()}
                            </Text>
                        </View>

          {/* ========================================== */}
          {/* 🚀 GEMU EDITION: THE COMMAND CENTER ROW      */}
          {/* ========================================== */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8, paddingHorizontal: 5, marginTop: 10 }}>
            <TouchableOpacity onPress={handleFormatText} style={{ padding: 8, backgroundColor: '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
              <Text style={{ color: '#00e676', fontWeight: 'bold' }}>🪄 Fix</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleLogicMode} style={{ padding: 8, backgroundColor: '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
              <Text style={{ color: '#00b0ff', fontWeight: 'bold' }}>🧠 Logic</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCreativeMode} style={{ padding: 8, backgroundColor: '#2d2d2d', borderRadius: 8, flex: 1, marginHorizontal: 2, alignItems: 'center' }}>
              <Text style={{ color: '#ff4081', fontWeight: 'bold' }}>🎨 Creative</Text>
            </TouchableOpacity>
          </View>
          {/* ========================================== */}

                        <TextInput
                            ref={inputRef}
                            style={styles.messageInput}
                            value={placeholderText}
                            onChangeText={setPlaceholderText}
                            textBreakStrategy="simple"
                            multiline
                        />
                        
          {/* ========================================== */}
          {/* 🚀 GEMU EDITION: THE SPARKLE BUTTON        */}
          {/* ========================================== */}
          <TouchableOpacity 
            onPress={handleEnhancePrompt}
            style={{
              padding: 10,
              backgroundColor: '#3b3b3b', 
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 10
            }}
          >
            <Text style={{ fontSize: 18 }}>✨ Auto-Enhance Message</Text>
          </TouchableOpacity>
          {/* ========================================== */}

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            }}>
                            <ThemedButton
                                label="Delete"
                                iconName="delete"
                                onPress={handleDeleteMessage}
                                variant="critical"
                            />
                            <ThemedButton
                                iconName="reload1"
                                variant="tertiary"
                                label="Reset"
                                onPress={() => swipeText && setPlaceholderText(swipeText)}
                            />
                            <ThemedButton
                                label="Confirm"
                                iconName="check"
                                onPress={handleEditMessage}
                                variant="secondary"
                            />
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

export default ChatEditor

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    const insets = useSafeAreaInsets()
    return StyleSheet.create({
        editorContainer: {
            flexShrink: 1,
            backgroundColor: color.neutral._100,
            paddingTop: spacing.xl,
            paddingBottom: spacing.l + insets.bottom,
            paddingHorizontal: spacing.xl,
            borderTopRightRadius: borderRadius.l,
            borderTopLeftRadius: borderRadius.l,
            marginTop: insets.top,
            rowGap: 12,
        },
        topText: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            columnGap: 12,
            shadowColor: color.shadow,
            borderTopRightRadius: spacing.m,
            borderTopLeftRadius: spacing.m,
        },
        nameText: {
            color: color.text._100,
            fontSize: fontSize.l,
        },
        timeText: {
            color: color.text._400,
            fontSize: fontSize.s,
        },
        messageInput: {
            color: color.text._100,
            borderColor: color.neutral._400,
            borderRadius: 8,
            borderWidth: 1,
            padding: 8,
            flexShrink: 1,
        },
    })
}
