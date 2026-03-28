import ThemedButton from '@components/buttons/ThemedButton'
import FadeBackrop from '@components/views/FadeBackdrop'
import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useState } from 'react'
import { GestureResponderEvent, Modal, StyleSheet, Text, TextInput, View } from 'react-native'
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

//TODO: This is somewhat unsafe, as it always expects index to be valid at 0
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

    // TODO: This should safely return if invalid values were given
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
    // 1. Check if the box is empty using Vali-98's exact variable
    if (!placeholderText || placeholderText.trim() === '') return; 

    const originalText = placeholderText;
    
    // 2. Show the user we are working
    setPlaceholderText("✨ Enhancing prompt offline...");

    try {
      // 3. The hidden system prompt! 
      const finalEnhancedText = `[System: Expand this idea into a detailed prompt] -> ${originalText}`;
      
      // 4. Update the text box instantly
      setPlaceholderText(finalEnhancedText);
    } catch (error) {
      // 5. Fail-safe
      setPlaceholderText(originalText);
    }
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
              marginVertical: 5
            }}
          >
            <Text style={{ fontSize: 18 }}>✨</Text>
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
