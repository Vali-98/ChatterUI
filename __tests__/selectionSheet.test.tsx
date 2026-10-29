import React, { act, createRef } from 'react'
import { TextInput } from 'react-native'
import SelectionSheet from '../app/components/input/SelectionSheet'
import InputSheet from '../app/components/views/InputSheet'
import type { BottomSheetRefFunctions } from '../app/components/views/BottomSheet'

jest.mock('../app/components/views/EdgeFade/EdgeFades', () => ({
    __esModule: true,
    default: () => null,
}))

jest.mock('../app/components/views/BottomSheet', () => {
    const React = require('react')
    const Part = ({ children }: any) => React.createElement('Part', null, children)
    return {
        __esModule: true,
        default: ({ ref, onOpen, onClose, children, onRequestClose }: any) => {
            React.useImperativeHandle(ref, () => ({
                open: () => onOpen?.(),
                close: () => onClose?.(),
            }))
            return React.createElement('Sheet', { onRequestClose, onClose }, children)
        },
        BottomSheetHeader: Part,
    }
})
jest.mock('../app/components/buttons/ThemedButton', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('Button', props),
}))
jest.mock('../app/components/buttons/ListButton', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('Row', props),
}))
jest.mock('../app/components/input/ThemedTextInput', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('Input', props),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({
            color: {
                text: { _100: '#000', _400: '#555' },
                neutral: { _200: '#eee' },
                error: { _400: '#a00' },
            },
        }),
    },
}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const items = [
    { id: 0, label: 'Same label' },
    { id: 1, label: 'Same label' },
]
const keyExtractor = (item: (typeof items)[number]) => item.id
const labelExtractor = (item: (typeof items)[number]) => item.label
const button = (renderer: any, label: string) =>
    renderer.root.findAllByType('Button').find((node: any) => node.props.label === label)

test('null selection needs confirmation; duplicate labels and reordering retain key identity', async () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const onSelect = jest.fn()
    const props = {
        ref,
        keyExtractor,
        labelExtractor,
        selectedKey: null,
        commitMode: 'confirm' as const,
        onSelect,
    }
    let renderer: any
    act(() => {
        renderer = create(<SelectionSheet {...props} items={items} />)
    })
    act(() => ref.current!.open())
    expect(button(renderer, 'common.actions.select').props.disabled).toBe(true)
    act(() => renderer.root.findAllByType('Row')[0].props.onPress())
    expect(onSelect).not.toHaveBeenCalled()
    act(() => renderer.update(<SelectionSheet {...props} items={[...items].reverse()} />))
    await act(async () => button(renderer, 'common.actions.select').props.onPress())
    expect(onSelect).toHaveBeenCalledWith(items[0])
    act(() => renderer.unmount())
})

test('multi selection cancels drafts, supports empty confirmation, and can commit immediately', async () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const onSelect = jest.fn()
    const props = {
        ref,
        items,
        keyExtractor,
        labelExtractor,
        multiple: true as const,
        selectedKeys: [0],
        onSelect,
    }
    let renderer: any
    act(() => {
        renderer = create(<SelectionSheet {...props} commitMode="confirm" />)
    })
    act(() => ref.current!.open())
    act(() => renderer.root.findAllByType('Row')[0].props.onPress())
    expect(onSelect).not.toHaveBeenCalled()
    act(() => ref.current!.close())
    act(() => ref.current!.open())
    expect(renderer.root.findAllByType('Row')[0].props.active).toBe(true)
    act(() => renderer.root.findAllByType('Row')[0].props.onPress())
    await act(async () => button(renderer, 'common.actions.select').props.onPress())
    expect(onSelect).toHaveBeenLastCalledWith([])
    act(() => renderer.update(<SelectionSheet {...props} commitMode="immediate" />))
    act(() => ref.current!.open())
    await act(async () => renderer.root.findAllByType('Row')[1].props.onPress())
    expect(onSelect).toHaveBeenLastCalledWith(items)
    act(() => renderer.unmount())
})

test('failed confirmation keeps the draft for retry and custom rows can supply search text', async () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const onSelect = jest
        .fn()
        .mockRejectedValueOnce(new Error('save failed'))
        .mockResolvedValueOnce(undefined)
    let renderer: any
    const close = jest.fn()
    act(() => {
        renderer = create(
            <SelectionSheet
                ref={ref}
                items={items}
                keyExtractor={keyExtractor}
                selectedKey={null}
                commitMode="confirm"
                onSelect={onSelect}
                onClose={close}
                search
                searchTextExtractor={(item) => String(item.id)}
                renderItem={(row) => React.createElement('Row', row)}
            />
        )
    })
    act(() => ref.current!.open())
    act(() => renderer.root.findByType(TextInput).props.onChangeText('1'))
    expect(renderer.root.findAllByType('Row')).toHaveLength(1)
    act(() => renderer.root.findByType('Row').props.onPress())
    await act(async () => button(renderer, 'common.actions.select').props.onPress())
    expect(close).not.toHaveBeenCalled()
    expect(renderer.root.findByType('Row').props.selected).toBe(true)
    await act(async () => button(renderer, 'common.actions.select').props.onPress())
    expect(onSelect).toHaveBeenLastCalledWith(items[1])
    expect(close).toHaveBeenCalledTimes(1)
    act(() => renderer.unmount())
})

test('InputSheet resets by default, scopes remembered drafts, and retains failed saves', async () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const onConfirm = jest.fn().mockRejectedValueOnce(new Error('save failed'))
    let renderer: any
    act(() => {
        renderer = create(<InputSheet ref={ref} defaultValue="original" onConfirm={onConfirm} />)
    })
    act(() => ref.current!.open())
    act(() => renderer.root.findByType('Input').props.onChangeText('draft'))
    act(() => ref.current!.close())
    act(() => ref.current!.open())
    expect(renderer.root.findByType('Input').props.value).toBe('original')
    act(() =>
        renderer.update(
            <InputSheet
                ref={ref}
                rememberInput
                inputKey="a"
                defaultValue="original"
                onConfirm={onConfirm}
            />
        )
    )
    act(() => ref.current!.open())
    act(() => renderer.root.findByType('Input').props.onChangeText('remembered'))
    act(() => ref.current!.close())
    act(() => ref.current!.open())
    expect(renderer.root.findByType('Input').props.value).toBe('remembered')
    await act(async () => button(renderer, 'common.actions.save').props.onPress())
    expect(renderer.root.findByType('Input').props.value).toBe('remembered')
    act(() =>
        renderer.update(
            <InputSheet
                ref={ref}
                rememberInput
                inputKey="b"
                defaultValue="other item"
                onConfirm={onConfirm}
            />
        )
    )
    act(() => ref.current!.open())
    expect(renderer.root.findByType('Input').props.value).toBe('other item')
    act(() => renderer.unmount())
})
