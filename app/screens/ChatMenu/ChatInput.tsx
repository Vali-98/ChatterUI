import { MaterialIcons } from '@expo/vector-icons'
import { generateResponse } from '@lib/engine/Inference'
import { useInference } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { AppSettings, Characters, Chats, Logger } from '@lib/utils/Global'
import React, { useState } from 'react'
import { TextInput, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

const ChatInput = () => {
    const { color, borderRadius, spacing } = Theme.useTheme()
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)

    const { addEntry } = Chats.useEntry()

    const { nowGenerating, abortFunction } = useInference((state) => ({
        nowGenerating: state.nowGenerating,
        abortFunction: state.abortFunction,
    }))

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
        Logger.log(`Aborting Generation`)
        if (abortFunction) await abortFunction()
    }

    const handleSend = async () => {
        if (newMessage.trim() !== '') await addEntry(userName ?? '', true, newMessage)
        const swipeId = await addEntry(charName ?? '', false, '')
        setNewMessage((message) => '')
        if (swipeId) generateResponse(swipeId)
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TextInput
                style={{
                    color: color.text._100,
                    backgroundColor: color.neutral._100,
                    flex: 1,
                    borderWidth: 1,
                    borderColor: color.primary._300,
                    borderRadius: borderRadius.l,
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.m,
                    marginHorizontal: spacing.m,
                }}
                placeholder="Message..."
                placeholderTextColor={color.text._700}
                value={newMessage}
                onChangeText={(text) => setNewMessage(text)}
                multiline
                submitBehavior={sendOnEnter ? 'blurAndSubmit' : 'newline'}
                onSubmitEditing={sendOnEnter ? handleSend : undefined}
            />

            {nowGenerating ? (
                <TouchableOpacity
                    style={{
                        borderRadius: borderRadius.m,
                        borderColor: color.error._500,
                        borderWidth: 2,
                        padding: spacing.m,
                    }}
                    onPress={abortResponse}>
                    <MaterialIcons name="stop" color={color.error._500} size={24} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={{
                        borderRadius: borderRadius.m,
                        backgroundColor: color.primary._500,
                        padding: spacing.m,
                    }}
                    onPress={handleSend}>
                    <MaterialIcons name="send" color={color.neutral._100} size={24} />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default ChatInput
