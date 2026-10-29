import { localDownload } from '@vali98/react-native-fs'
import { Image } from 'expo-image'
import { shareAsync } from 'expo-sharing'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Platform, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { useAppModeStore } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { readableFileSize } from '@lib/utils/File'

type ViewerImage = { uri: string; name: string; mime_type?: string; size?: number }

const ZoomableImage = ({
    uri,
    onNavigate,
}: {
    uri: string
    onNavigate: (direction: number) => void
}) => {
    const scale = useSharedValue(1)
    const startScale = useSharedValue(1)
    const width = useSharedValue(0)
    const height = useSharedValue(0)
    const x = useSharedValue(0)
    const y = useSharedValue(0)
    const startedZoomed = useSharedValue(false)
    const startX = useSharedValue(0)
    const startY = useSharedValue(0)
    const pinch = Gesture.Pinch()
        .onStart(() => {
            startScale.value = scale.value
        })
        .onUpdate((event) => {
            scale.value = Math.max(1, Math.min(5, startScale.value * event.scale))
            if (scale.value === 1) {
                x.value = 0
                y.value = 0
            }
        })
    const pan = Gesture.Pan()
        .maxPointers(1)
        .onStart(() => {
            startedZoomed.value = scale.value > 1
            startX.value = x.value
            startY.value = y.value
        })
        .onUpdate((event) => {
            if (scale.value > 1) {
                const maxX = (width.value * (scale.value - 1)) / 2
                const maxY = (height.value * (scale.value - 1)) / 2
                x.value = Math.max(-maxX, Math.min(maxX, startX.value + event.translationX))
                y.value = Math.max(-maxY, Math.min(maxY, startY.value + event.translationY))
            }
        })
        .onEnd((event) => {
            if (
                !startedZoomed.value &&
                scale.value === 1 &&
                Math.abs(event.translationX) > 50 &&
                Math.abs(event.translationX) > Math.abs(event.translationY) * 1.5
            ) {
                scheduleOnRN(onNavigate, event.translationX < 0 ? 1 : -1)
            }
        })
    const reset = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            scale.value = 1
            x.value = 0
            y.value = 0
        })
    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
    }))
    return (
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, reset)}>
            <View
                style={{ flex: 1, overflow: 'hidden' }}
                onLayout={(event) => {
                    width.value = event.nativeEvent.layout.width
                    height.value = event.nativeEvent.layout.height
                }}>
                <Animated.View style={[{ flex: 1 }, style]}>
                    <Image source={{ uri }} contentFit="contain" style={{ flex: 1 }} />
                </Animated.View>
            </View>
        </GestureDetector>
    )
}

const AttachmentViewer = ({
    images,
    initialIndex,
    onClose,
}: {
    images: ViewerImage[]
    initialIndex: number
    onClose: () => void
}) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [index, setIndex] = useState(initialIndex)
    const [busy, setBusy] = useState(false)
    const image = images[index]
    const appMode = useAppModeStore((state) => state.appMode)
    const exportImage = async (share: boolean) => {
        if (busy || !image) return
        setBusy(true)
        try {
            if (share || Platform.OS === 'ios')
                await shareAsync(image.uri, { mimeType: image.mime_type })
            else {
                await localDownload(image.uri.replace('file://', ''))
                Logger.infoToast(t('chat.attachments.saved'))
            }
        } catch (error) {
            Logger.error(error)
            Logger.errorToast(t('chat.attachments.exportFailed'))
        } finally {
            setBusy(false)
        }
    }
    if (!image) return null
    return (
        <Modal visible animationType="fade" onRequestClose={onClose}>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.neutral._100 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, rowGap: 4 }}>
                        <TText numberOfLines={1}>{image.name}</TText>
                        <TText color="400" size={12}>
                            {[
                                image.size !== undefined ? readableFileSize(image.size) : undefined,
                                appMode === 'remote'
                                    ? t('chat.attachments.estimatedTokens', { count: 512 })
                                    : undefined,
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </TText>
                    </View>
                    <ZoomableImage
                        key={image.uri}
                        uri={image.uri}
                        onNavigate={(direction) =>
                            setIndex((current) =>
                                Math.max(0, Math.min(images.length - 1, current + direction))
                            )
                        }
                    />
                    <View
                        style={{
                            alignItems: 'center',
                            rowGap: 20,
                            paddingHorizontal: 16,
                            paddingTop: 12,
                            paddingBottom: 32,
                        }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                alignSelf: 'stretch',
                            }}>
                            <IconButton
                                iconName="left"
                                variant="tertiary"
                                disabled={index === 0}
                                viewStyle={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 8,
                                    borderWidth: 0,
                                }}
                                accessibilityLabel={t('chat.attachments.previous')}
                                onPress={() => setIndex((current) => Math.max(0, current - 1))}
                            />
                            <TText>
                                {index + 1}/{images.length}
                            </TText>
                            <IconButton
                                iconName="right"
                                variant="tertiary"
                                disabled={index >= images.length - 1}
                                viewStyle={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 8,
                                    borderWidth: 0,
                                }}
                                accessibilityLabel={t('chat.attachments.next')}
                                onPress={() =>
                                    setIndex((current) => Math.min(images.length - 1, current + 1))
                                }
                            />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12 }}>
                            <ThemedButton
                                iconName="download"
                                label={t('common.actions.save')}
                                variant="secondary"
                                accessibilityLabel={t('chat.attachments.save')}
                                onPress={() => exportImage(false)}
                                disabled={busy}
                            />
                            <ThemedButton
                                iconName="share-alt"
                                label={t('common.actions.share')}
                                variant="secondary"
                                accessibilityLabel={t('chat.attachments.share')}
                                onPress={() => exportImage(true)}
                                disabled={busy}
                            />
                            <ThemedButton
                                iconName="close"
                                label={t('common.actions.close')}
                                variant="tertiary"
                                onPress={onClose}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        </Modal>
    )
}

export default AttachmentViewer
