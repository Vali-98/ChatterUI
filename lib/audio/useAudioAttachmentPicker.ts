import { useEffect, useRef, useState } from 'react'

import { deleteFile } from '@lib/utils/File'

import { pickAudioAttachments, type AudioAttachmentFile } from './files'

// Each picker operation belongs to the composer chat where it started.
export const useAudioAttachmentPicker = (
    chatId: number | undefined,
    onAttach: (attachments: AudioAttachmentFile[]) => void
) => {
    const [pending, setPending] = useState<Record<number, number>>({})
    const activeChat = useRef(chatId)
    const mounted = useRef(true)
    useEffect(() => {
        activeChat.current = chatId
    }, [chatId])
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const pickAudio = async () => {
        if (chatId === undefined) return
        let preparing = false
        try {
            const attachments = await pickAudioAttachments({
                onPrepare: () => {
                    preparing = true
                    if (mounted.current)
                        setPending((state) => ({
                            ...state,
                            [chatId]: (state[chatId] ?? 0) + 1,
                        }))
                },
            })
            if (!mounted.current || activeChat.current !== chatId) {
                for (const attachment of attachments) deleteFile(attachment.uri)
                return
            }
            if (attachments.length > 0) onAttach(attachments)
        } finally {
            if (preparing && mounted.current)
                setPending((state) => {
                    const next = { ...state }
                    if (next[chatId] > 1) next[chatId]--
                    else delete next[chatId]
                    return next
                })
        }
    }

    return { pickAudio, isPreparingAudio: chatId !== undefined && (pending[chatId] ?? 0) > 0 }
}
