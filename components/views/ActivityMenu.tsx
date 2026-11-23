import { useIsFocused } from 'expo-router'
import {
    createContext,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
    BackHandler,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native'
import Animated, { FadeOut } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'
import { ExpandHeightIn, ShrinkHeightOut } from '@lib/animations/transitions'

import { getFloatingPanelColor, type FloatingPanelVariant } from './FloatingPanel'
import ProgressBar from './ProgressBar'
import Portal from './Portal'

export type ActivityItem = {
    label: string
    variant: FloatingPanelVariant
    content: ReactNode
    scope: 'chat' | 'app'
    previewKey?: string
    progress?: number
}

export const ActivityContext = createContext<{
    update: (id: string, item: ActivityItem) => void
    remove: (id: string) => void
    close: () => void
} | null>(null)

const ActivityMenu = ({ children }: { children: ReactNode }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const focused = useIsFocused()
    const { width, height } = useWindowDimensions()
    const menuId = useId()
    const anchor = useRef<View>(null)
    const [anchorPosition, setAnchorPosition] = useState({ bottom: 0, center: 0 })
    const { bottom } = anchorPosition
    const [items, setItems] = useState<Record<string, ActivityItem>>({})
    const [open, setOpen] = useState(false)
    const [preview, setPreview] = useState<{ id: string; key: string }>()
    const initialized = useRef(false)
    const availability = useRef({ focused, open })
    availability.current = { focused, open }
    const seenPreviews = useRef(new Set<string>())
    const close = useCallback(() => setOpen(false), [])
    const measure = useCallback(() => {
        anchor.current?.measureInWindow((x, y, w, h) =>
            setAnchorPosition({ bottom: y + h + 8, center: x + w / 2 })
        )
    }, [])
    const update = useCallback(
        (id: string, item: ActivityItem) => {
            setItems((previous) => ({ ...previous, [id]: item }))
            if (!item.previewKey || seenPreviews.current.has(item.previewKey)) return
            seenPreviews.current.add(item.previewKey)
            // Existing activity is registered on mount too. Only announce new starts while here.
            if (!initialized.current || !availability.current.focused || availability.current.open)
                return
            measure()
            setPreview({ id, key: item.previewKey })
        },
        [measure]
    )
    const remove = useCallback((id: string) => {
        setItems((previous) => {
            const next = { ...previous }
            delete next[id]
            return next
        })
    }, [])
    const context = useMemo(() => ({ update, remove, close }), [update, remove, close])
    useEffect(() => {
        initialized.current = true
    }, [])
    useEffect(() => {
        if (!focused) {
            setOpen(false)
            setPreview(undefined)
        }
    }, [focused])
    useEffect(() => {
        if (!preview) return
        const timer = setTimeout(() => setPreview(undefined), 3000)
        return () => clearTimeout(timer)
    }, [preview])
    useEffect(() => {
        if (!open || !focused) return
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            close()
            return true
        })
        return () => listener.remove()
    }, [open, focused, close])
    const values = Object.values(items)
    const variant = values.some((item) => item.variant === 'error')
        ? 'error'
        : values.some((item) => item.variant === 'warning')
          ? 'warning'
          : 'primary'
    const badgeColor = getFloatingPanelColor(color, variant)
    const previewItem = preview && items[preview.id]
    const show = () => {
        measure()
        setPreview(undefined)
        setOpen(true)
    }
    const groups = (['chat', 'app'] as const).map((scope) => ({
        scope,
        items: Object.entries(items)
            .filter(([, item]) => item.scope === scope)
            .sort(([, a], [, b]) => {
                const rank = { error: 0, warning: 1, neutral: 2, primary: 2 }
                return rank[a.variant] - rank[b.variant]
            }),
    }))
    return (
        <ActivityContext.Provider value={context}>
            {children}
            <View ref={anchor} collapsable={false} style={{ marginRight: 12 }}>
                <IconButton
                    iconName="bell"
                    iconSize={22}
                    variant="tertiary"
                    accessibilityLabel={t('common.activity.title')}
                    onPress={show}
                />
                {values.length > 0 && (
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            right: -2,
                            top: -2,
                            borderRadius: 12,
                            minWidth: 18,
                            height: 18,
                            paddingHorizontal: 3,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: badgeColor,
                        }}>
                        <TText size={10} style={{ color: color.neutral._100 }}>
                            {values.length}
                        </TText>
                    </View>
                )}
            </View>
            <Portal name={`activity-panel-${menuId}`}>
                {open && focused && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
                        <View
                            collapsable={false}
                            style={{
                                position: 'absolute',
                                top: bottom,
                                right: 12,
                                width: Math.min(380, width - 24),
                            }}>
                            <Animated.View
                                testID="activity-panel"
                                entering={ExpandHeightIn}
                                exiting={ShrinkHeightOut}
                                style={{
                                    backgroundColor: color.neutral._200,
                                    borderColor: color.neutral._400,
                                    borderWidth: 1,
                                    borderRadius: 8,
                                    padding: 4,
                                    overflow: 'hidden',
                                }}>
                                <ScrollView
                                    style={{
                                        flexGrow: 0,
                                        maxHeight: Math.max(80, height - bottom - 120),
                                    }}
                                    contentContainerStyle={{ gap: 4 }}>
                                    {!values.length && (
                                        <TText
                                            color="400"
                                            style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                                            {t('common.activity.empty')}
                                        </TText>
                                    )}
                                    {groups
                                        .filter((group) => group.items.length)
                                        .map((group) => (
                                            <View key={group.scope}>
                                                <TText
                                                    color="400"
                                                    size={12}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                    }}>
                                                    {t(`common.activity.${group.scope}`)}
                                                </TText>
                                                {group.items.map(([id, item]) => (
                                                    <View key={id}>{item.content}</View>
                                                ))}
                                            </View>
                                        ))}
                                </ScrollView>
                            </Animated.View>
                        </View>
                    </View>
                )}
            </Portal>
            {/* A non-modal preview leaves the rest of the screen interactive. */}
            <ActivityPreview
                bottom={bottom}
                center={anchorPosition.center}
                width={width}
                onPress={show}
                item={focused && !open ? previewItem : undefined}
            />
        </ActivityContext.Provider>
    )
}

// Portal is needed because this component lives in the native navigation header.
const ActivityPreview = ({
    bottom,
    center,
    width,
    item,
    onPress,
}: {
    bottom: number
    center: number
    width: number
    item: ActivityItem | undefined
    onPress: () => void
}) => {
    const { color } = Theme.useTheme()
    const id = useId()
    return (
        <Portal name={`activity-preview-${id}`}>
            {item && (
                <Animated.View
                    testID="activity-preview"
                    entering={ExpandHeightIn}
                    exiting={FadeOut.duration(200)}
                    style={{
                        position: 'absolute',
                        top: bottom,
                        right: 12,
                        width: Math.min(320, width - 24),
                    }}>
                    <View
                        style={{
                            alignSelf: 'flex-end',
                            marginRight: Math.max(6, width - center - 18),
                            borderLeftWidth: 6,
                            borderRightWidth: 6,
                            borderBottomWidth: 7,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: color.neutral._400,
                        }}
                    />
                    <Pressable onPress={onPress}>
                        <View
                            style={{
                                backgroundColor: color.neutral._200,
                                borderWidth: 1,
                                borderColor: color.neutral._400,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                gap: 8,
                            }}>
                            <TText numberOfLines={1}>{item.label}</TText>
                            {item.progress !== undefined && (
                                <ProgressBar progress={item.progress} color={color.primary._500} />
                            )}
                        </View>
                    </Pressable>
                </Animated.View>
            )}
        </Portal>
    )
}
export default ActivityMenu
