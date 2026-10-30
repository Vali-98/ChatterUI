import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
    useWindowDimensions,
} from 'react-native'
import {
    useKeyboardHandler,
    useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller'
import { scheduleOnRN } from 'react-native-worklets'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import BottomSheet, { BottomSheetHeader, useBottomSheetRef } from '@components/views/BottomSheet'
import BottomSheetControls, { BottomSheetButton } from '@components/views/BottomSheetControls'
import { EdgeFadeScrollView } from '@components/views/EdgeFade'
import ListCard from '@components/views/ListCard'
import { Theme } from '@lib/theme/ThemeManager'

import Animated, { useAnimatedStyle, useSharedValue, ZoomIn } from 'react-native-reanimated'
import type { SelectionKey } from './SelectionSheet'
import ThemedTextInput from './ThemedTextInput'

export type ListEditorSheetProps<T> = {
    title?: string
    showLabel?: boolean
    description?: string
    value: readonly T[]
    onChangeValue: (items: T[]) => void | Promise<void>
    keyExtractor: (item: T) => SelectionKey
    labelExtractor: (item: T) => string
    suggestions?: readonly T[]
    /** Minimum available suggestions before showing search. Zero shows it for any nonempty list. */
    filterThreshold?: number
    /** Construct an item without persisting it; confirm mode may discard the draft. */
    createItem?: (text: string) => T | Promise<T>
    commitMode?: 'immediate' | 'confirm'
    previewNumber?: number
    placeholder?: string
    emptyLabel?: string
    confirmLabel?: string
    multiline?: boolean
    viewStyle?: StyleProp<ViewStyle>
}

// Show whitespace without changing the value passed to createItem/onChangeValue.
const previewText = (text: string) =>
    text.replaceAll('\r', '\\r').replaceAll('\n', '\\n').replaceAll('\t', '\\t')

const ListEditorSheet = <T,>({
    title,
    showLabel = true,
    description,
    value,
    onChangeValue,
    keyExtractor,
    labelExtractor,
    suggestions = [],
    filterThreshold = 8,
    createItem,
    commitMode = 'immediate',
    previewNumber = 3,
    placeholder,
    emptyLabel,
    confirmLabel,
    multiline = false,
    viewStyle,
}: ListEditorSheetProps<T>) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const { height } = useWindowDimensions()
    const sheet = useBottomSheetRef()
    const [draft, setDraft] = useState<T[]>([])
    const [text, setText] = useState('')
    const [filter, setFilter] = useState('')
    const [entryFocused, setEntryFocused] = useState(false)
    const suggestionsHeight = useSharedValue(0)
    const { progress: keyboardProgress } = useReanimatedKeyboardAnimation()
    const suggestionsStyle = useAnimatedStyle(() => {
        const visible = entryFocused ? 1 - keyboardProgress.value : 1
        return {
            height:
                suggestionsHeight.value > 0 ? (suggestionsHeight.value + 12) * visible : undefined,
            paddingTop: 12 * visible,
        }
    })
    const [expanded, setExpanded] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const pending = useRef(false)
    useKeyboardHandler(
        {
            onEnd: (event) => {
                'worklet'
                if (event.height === 0) scheduleOnRN(setEntryFocused, false)
            },
        },
        []
    )
    const items = commitMode === 'confirm' ? draft : value
    const keys = new Set(items.map(keyExtractor))
    const available = suggestions.filter((item) => !keys.has(keyExtractor(item)))
    const showFilter =
        available.length > 0 && (available.length >= filterThreshold || filter.length > 0)
    const matching = available.filter((item) =>
        labelExtractor(item).toLocaleLowerCase().includes(filter.toLocaleLowerCase())
    )
    const limit = Math.max(0, Math.floor(previewNumber))
    const canExpand = value.length > limit + 1
    const preview = expanded || !canExpand ? value : value.slice(0, limit)
    const hiddenCount = value.length - preview.length
    const groupStyle: ViewStyle = {
        flexShrink: 1,
        borderWidth: 1,
        borderColor: color.neutral._300,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        rowGap: 10,
    }
    const itemStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 8,
        backgroundColor: color.neutral._200,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    }
    const update = (next: T[]) => {
        if (commitMode === 'confirm') setDraft(next)
        else return onChangeValue(next)
    }
    const perform = (action: () => void | Promise<void>) => {
        if (pending.current) return
        setError('')
        try {
            const result = action()
            if (result) {
                pending.current = true
                setBusy(true)
                void result
                    .catch((cause) => {
                        setError(cause instanceof Error ? cause.message : String(cause))
                    })
                    .finally(() => {
                        pending.current = false
                        setBusy(false)
                    })
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
        }
    }
    const append = (item: T) => {
        if (keys.has(keyExtractor(item))) {
            setError(t('listEditor.duplicateValueError'))
            return
        }
        const result = update([...items, item])
        if (result) return result.then(() => setText(''))
        setText('')
    }
    const addText = () => {
        if (!createItem || text.length === 0) return
        void perform(() => {
            const existing = suggestions.find((item) => labelExtractor(item) === text)
            if (existing !== undefined) return append(existing)
            const item = createItem(text)
            return item instanceof Promise ? item.then(append) : append(item)
        })
    }

    return (
        <View style={[{ rowGap: 8 }, viewStyle]}>
            {((showLabel && title) || description) && (
                <View style={{ rowGap: 4 }}>
                    {showLabel && title && <TText>{title}</TText>}
                    {description && (
                        <TText color="400" size={12}>
                            {description}
                        </TText>
                    )}
                </View>
            )}
            <ListCard
                active={false}
                style={{
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    columnGap: 12,
                }}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.actions.edit')}
                    style={StyleSheet.absoluteFill}
                    onPress={() => sheet.current?.open()}
                />
                <EdgeFadeScrollView
                    containerStyle={{ flex: 1, maxHeight: 160 }}
                    nestedScrollEnabled
                    style={{ flexGrow: 0, maxHeight: 160 }}
                    contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {preview.map((item) => (
                        <View
                            pointerEvents="none"
                            key={keyExtractor(item)}
                            style={[itemStyle, { maxWidth: '100%' }]}>
                            <TText numberOfLines={1}>{previewText(labelExtractor(item))}</TText>
                        </View>
                    ))}
                    {value.length === 0 && (
                        <View pointerEvents="none">
                            <TText color="400">
                                {emptyLabel ?? t('common.emptyStates.noItems')}
                            </TText>
                        </View>
                    )}
                    {hiddenCount > 0 && (
                        <ThemedButton
                            label={`+${hiddenCount}`}
                            variant="secondary"
                            level="muted"
                            viewStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
                            onPress={() => setExpanded(true)}
                        />
                    )}
                    {expanded && canExpand && (
                        <IconButton
                            iconName="left"
                            variant="secondary"
                            iconSize={16}
                            viewStyle={{ paddingHorizontal: 8 }}
                            level="muted"
                            accessibilityLabel={t('common.actions.collapse')}
                            onPress={() => setExpanded(false)}
                        />
                    )}
                </EdgeFadeScrollView>
                <IconButton
                    iconName="edit"
                    accessibilityLabel={t('common.actions.edit')}
                    onPress={() => sheet.current?.open()}
                />
            </ListCard>
            <BottomSheet
                ref={sheet}
                sheetStyle={{ maxHeight: '90%' }}
                onOpen={() => {
                    setDraft([...value])
                    setText('')
                    setFilter('')
                    setEntryFocused(false)
                    setError('')
                }}
                onRequestClose={busy ? () => {} : undefined}>
                <Animated.View style={{ flexShrink: 1 }}>
                    <BottomSheetHeader
                        title={title ?? t('common.actions.edit')}
                        description={description}
                        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
                    />
                    <Animated.View
                        style={{
                            flexShrink: 1,
                            paddingHorizontal: 16,
                            paddingVertical: 4,
                            rowGap: 0,
                        }}>
                        <View style={groupStyle}>
                            <TText color="400">{t('common.labels.selected')}</TText>
                            {items.length === 0 && (
                                <TText color="400">
                                    {emptyLabel ?? t('common.emptyStates.noItems')}
                                </TText>
                            )}
                            <EdgeFadeScrollView
                                containerStyle={{ flexShrink: 1 }}
                                style={{ flexGrow: 0, flexShrink: 1, maxHeight: height * 0.28 }}
                                contentContainerStyle={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                }}
                                keyboardShouldPersistTaps="handled">
                                {items.map((item) => (
                                    <Animated.View
                                        entering={ZoomIn.duration(120)}
                                        key={keyExtractor(item)}
                                        style={[
                                            itemStyle,
                                            { maxWidth: '100%', alignItems: 'flex-end' },
                                        ]}>
                                        <TText>{previewText(labelExtractor(item))}</TText>
                                        <IconButton
                                            iconName="close"
                                            level="muted"
                                            iconSize={10}
                                            disabled={busy}
                                            accessibilityLabel={t('common.actions.delete')}
                                            onPress={() => {
                                                void perform(() =>
                                                    update(
                                                        items.filter(
                                                            (entry) =>
                                                                keyExtractor(entry) !==
                                                                keyExtractor(item)
                                                        )
                                                    )
                                                )
                                            }}
                                        />
                                    </Animated.View>
                                ))}
                            </EdgeFadeScrollView>
                        </View>
                        {available.length > 0 && (
                            <Animated.View
                                testID="list-editor-suggestions"
                                pointerEvents={entryFocused ? 'none' : 'auto'}
                                style={[{ flexShrink: 1, overflow: 'hidden' }, suggestionsStyle]}>
                                <View
                                    onLayout={(event) =>
                                        suggestionsHeight.set(event.nativeEvent.layout.height)
                                    }
                                    style={[groupStyle, { flexShrink: 0 }]}>
                                    <TText color="400">
                                        {t(
                                            matching.length > 0
                                                ? 'common.labels.suggestions'
                                                : 'common.emptyStates.noSuggestions'
                                        )}
                                    </TText>
                                    <EdgeFadeScrollView
                                        containerStyle={{ flexShrink: 1 }}
                                        style={{
                                            flexGrow: 0,
                                            flexShrink: 1,
                                            maxHeight: height * 0.28,
                                        }}
                                        contentContainerStyle={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 6,
                                        }}
                                        keyboardShouldPersistTaps="handled">
                                        {matching.map((item) => (
                                            <ThemedButton
                                                key={keyExtractor(item)}
                                                label={previewText(labelExtractor(item))}
                                                iconName="plus"
                                                iconSize={12}
                                                variant="tertiary"
                                                disabled={busy}
                                                viewStyle={[itemStyle, { maxWidth: '100%' }]}
                                                onPress={() => {
                                                    void perform(() => append(item))
                                                }}
                                            />
                                        ))}
                                    </EdgeFadeScrollView>
                                    {showFilter && (
                                        <ThemedTextInput
                                            value={filter}
                                            onChangeText={setFilter}
                                            editable={!busy}
                                            placeholder={t('dropdown.filter')}
                                        />
                                    )}
                                </View>
                            </Animated.View>
                        )}
                        {!!error && <TText style={{ color: color.error._400 }}>{error}</TText>}
                    </Animated.View>
                    <Animated.View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                        {createItem && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    columnGap: 8,
                                }}>
                                <ThemedTextInput
                                    value={text}
                                    onChangeText={setText}
                                    placeholder={placeholder ?? t('common.placeholders.addItem')}
                                    viewStyle={{ flex: 1 }}
                                    onFocus={() => setEntryFocused(true)}
                                    editable={!busy}
                                    multiline={multiline}
                                    onSubmitEditing={!multiline ? addText : undefined}
                                    returnKeyType={!multiline ? 'done' : undefined}
                                    submitBehavior={multiline ? 'newline' : 'submit'}
                                />
                                <ThemedButton
                                    label={t('common.actions.add')}
                                    disabled={busy || text.length === 0}
                                    onPress={addText}
                                />
                            </View>
                        )}
                        <BottomSheetControls>
                            <BottomSheetButton
                                label={t(
                                    commitMode === 'confirm'
                                        ? 'common.actions.close'
                                        : 'common.actions.save'
                                )}
                                disabled={busy}
                                onPress={() => sheet.current?.close()}
                            />
                            {commitMode === 'confirm' && (
                                <BottomSheetButton
                                    label={confirmLabel ?? t('common.actions.save')}
                                    disabled={busy}
                                    onPress={() => {
                                        void perform(async () => {
                                            await onChangeValue([...draft])
                                            sheet.current?.close()
                                        })
                                    }}
                                />
                            )}
                        </BottomSheetControls>
                    </Animated.View>
                </Animated.View>
            </BottomSheet>
        </View>
    )
}

export default ListEditorSheet
