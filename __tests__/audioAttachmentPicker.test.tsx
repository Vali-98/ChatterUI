import React, { act } from 'react'

import { pickAudioAttachments, type AudioAttachmentFile } from '../lib/audio/files'
import { useAudioAttachmentPicker } from '../lib/audio/useAudioAttachmentPicker'
import { deleteFile } from '../lib/utils/File'

jest.mock('../lib/audio/files', () => ({ pickAudioAttachments: jest.fn() }))
jest.mock('../lib/utils/File', () => ({ deleteFile: jest.fn() }))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
type Job = { resolve: (items: AudioAttachmentFile[]) => void; reject: (error: Error) => void }
let jobs: Job[]
let picker: ReturnType<typeof useAudioAttachmentPicker>
const onAttach = jest.fn()
const file: AudioAttachmentFile = {
    uri: '/cache/converted.wav',
    name: 'converted.wav',
    type: 'audio',
}
const Harness = ({ chatId }: { chatId: number }) => {
    picker = useAudioAttachmentPicker(chatId, onAttach)
    return null
}
beforeEach(() => {
    jest.clearAllMocks()
    jobs = []
    jest.mocked(pickAudioAttachments).mockImplementation(({ onPrepare } = {}) => {
        onPrepare?.()
        return new Promise((resolve, reject) => jobs.push({ resolve, reject }))
    })
})

test('overlapping audio imports keep Send blocked until both finish', async () => {
    let renderer: any
    act(() => {
        renderer = create(<Harness chatId={1} />)
    })
    let first!: Promise<void>, second!: Promise<void>
    act(() => {
        first = picker.pickAudio()
        second = picker.pickAudio()
    })
    expect(picker.isPreparingAudio).toBe(true)
    await act(async () => {
        jobs[0].resolve([file])
        await first
    })
    expect(picker.isPreparingAudio).toBe(true)
    await act(async () => {
        jobs[1].resolve([])
        await second
    })
    expect(picker.isPreparingAudio).toBe(false)
    expect(onAttach).toHaveBeenCalledWith([file])
    act(() => renderer.unmount())
})

test('a conversion failure releases the Send guard', async () => {
    let renderer: any
    act(() => {
        renderer = create(<Harness chatId={1} />)
    })
    let pending!: Promise<void>
    act(() => {
        pending = picker.pickAudio()
    })
    await act(async () => {
        jobs[0].reject(new Error('codec failed'))
        await expect(pending).rejects.toThrow('codec failed')
    })
    expect(picker.isPreparingAudio).toBe(false)
    expect(onAttach).not.toHaveBeenCalled()
    act(() => renderer.unmount())
})

test('switching chats does not block the new composer or attach old conversion results', async () => {
    let renderer: any
    act(() => {
        renderer = create(<Harness chatId={1} />)
    })
    let pending!: Promise<void>
    act(() => {
        pending = picker.pickAudio()
    })
    act(() => renderer.update(<Harness chatId={2} />))
    expect(picker.isPreparingAudio).toBe(false)
    await act(async () => {
        jobs[0].resolve([file])
        await pending
    })
    expect(onAttach).not.toHaveBeenCalled()
    expect(deleteFile).toHaveBeenCalledWith(file.uri)
    act(() => renderer.unmount())
})

test('leaving the composer cleans late conversion results', async () => {
    let renderer: any
    act(() => {
        renderer = create(<Harness chatId={1} />)
    })
    let pending!: Promise<void>
    act(() => {
        pending = picker.pickAudio()
    })
    act(() => renderer.unmount())
    jobs[0].resolve([file])
    await pending
    expect(onAttach).not.toHaveBeenCalled()
    expect(deleteFile).toHaveBeenCalledWith(file.uri)
})
