import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import ListButton from '@components/buttons/ListButton'
import DownloadList from '@components/downloads/DownloadList'
import TText from '@components/text/TText'
import ListCard, { ListCardSection } from '@components/views/ListCard'
import {
    downloadModel,
    fitsDeviceMemory,
    getDeviceMemory,
    recommendedModels,
} from '@lib/downloads/models'
import { useDownloadStore } from '@lib/downloads/store'
import { GGMLNameMap } from '@lib/engine/Local/GGML'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Model, ModelListQueryType } from '@lib/engine/Local/Model'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { readableFileSize, AppDirectory } from '@lib/utils/File'

const LocalSetup = ({ models }: { models: ModelListQueryType[] }) => {
    const { t } = useTranslation()
    const { color, spacing, borderRadius } = Theme.useTheme()
    const [busy, setBusy] = useState(false)
    const [memory] = useState(getDeviceMemory)
    const [downloadId, setDownloadId] = useState<string>()
    const lastModelId = Llama.useLlamaPreferencesStore((state) => state.lastModel?.id)
    const readyModel = models.find((model) => model.id === lastModelId) ?? models[0]
    const downloads = useDownloadStore((state) => state.downloads)
    const selectedDownload =
        downloads.find((item) => item.id === downloadId) ??
        downloads.find(
            (item) =>
                item.status !== 'completed' && item.destination.startsWith(AppDirectory.ModelPath)
        )
    const importFromStorage = async (action: () => Promise<unknown>) => {
        if (busy) return
        setBusy(true)
        try {
            await action()
        } catch (error) {
            Logger.errorToast(t('downloads.failed'), error)
        } finally {
            setBusy(false)
        }
    }
    if (readyModel) {
        const quantization =
            GGMLNameMap[Number(readyModel.quantization) as keyof typeof GGMLNameMap]
        return (
            <Animated.View key="ready" entering={FadeIn} exiting={FadeOut} style={{ gap: 24 }}>
                <TText size={28} style={{ fontWeight: '600' }}>
                    {t('onboarding.modelReady')}
                </TText>
                <ListCard active={false} style={{ paddingHorizontal: 24, width: '100%' }}>
                    <ListCardSection
                        style={{
                            flex: 1,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            paddingVertical: 16,
                            gap: 12,
                        }}>
                        <TText size={20}>{readyModel.name}</TText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {[
                                readyModel.params,
                                quantization,
                                readyModel.architecture,
                                readableFileSize(readyModel.file_size),
                                `${t('model.item.contextlength')}: ${readyModel.context_length.toLocaleString()}`,
                            ]
                                .filter((value) => value && value !== 'N/A')
                                .map((badge, index) => (
                                    <TText
                                        key={index}
                                        color="300"
                                        style={{
                                            borderRadius: borderRadius.m,
                                            borderColor: color.primary._300,
                                            borderWidth: 1,
                                            paddingHorizontal: spacing.m,
                                            paddingVertical: spacing.s,
                                        }}>
                                        {badge}
                                    </TText>
                                ))}
                        </View>
                        <TText color="400" size={12} numberOfLines={2}>
                            {t('model.item.file')}: {readyModel.file}
                        </TText>
                    </ListCardSection>
                </ListCard>
                <TText color="400">{t('onboarding.autoLoadHint')}</TText>
            </Animated.View>
        )
    }

    if (selectedDownload)
        return (
            <Animated.View key={selectedDownload.id} entering={FadeIn} exiting={FadeOut}>
                <DownloadList downloadIds={[selectedDownload.id]} />
            </Animated.View>
        )

    return (
        <Animated.View
            key="suggestions"
            layout={LinearTransition}
            entering={FadeIn}
            exiting={FadeOut}
            style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: color.neutral._300 }} />
                <TText color="400">{t('onboarding.downloadSection')}</TText>
                <View style={{ flex: 1, height: 1, backgroundColor: color.neutral._300 }} />
            </View>
            {!recommendedModels.length && (
                <TText color="400">{t('onboarding.noRecommendations')}</TText>
            )}
            {recommendedModels.map((model) => {
                const fits = fitsDeviceMemory(model, memory)
                return (
                    <ListCard
                        key={model.id}
                        active={false}
                        style={{ padding: 16, gap: 24, alignItems: 'center' }}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <TText size={17}>{model.name}</TText>
                            <TText color="400">{model.description}</TText>
                            <TText color="400" size={12}>
                                {readableFileSize(model.sizeBytes)} · {model.tags.join(' · ')}
                            </TText>
                            {fits !== undefined && (
                                <TText color="400" size={12}>
                                    {t(fits ? 'downloads.fits' : 'downloads.large')}
                                </TText>
                            )}
                        </View>
                        <IconButton
                            variant="tertiary"
                            iconName="download"
                            accessibilityLabel={t('common.actions.download')}
                            onPress={() => {
                                try {
                                    setDownloadId(downloadModel(model.downloadUrl, model.filename))
                                } catch (error) {
                                    Logger.errorToast(t('downloads.failed'), error)
                                }
                            }}
                        />
                    </ListCard>
                )
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: color.neutral._300 }} />
                <TText color="400">{t('onboarding.storageSection')}</TText>
                <View style={{ flex: 1, height: 1, backgroundColor: color.neutral._300 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, opacity: busy ? 0.5 : 1 }}>
                <ListButton
                    active={false}
                    onPress={() => importFromStorage(Model.importModel)}
                    style={{ flex: 1, padding: 12, flexDirection: 'column', gap: 4 }}>
                    <TText size={16}>{t('onboarding.importInstead')}</TText>
                    <TText color="400" size={12}>
                        {t('onboarding.importExplanation')}
                    </TText>
                </ListButton>
                <ListButton
                    active={false}
                    onPress={() => importFromStorage(Model.linkModelExternal)}
                    style={{ flex: 1, padding: 12, flexDirection: 'column', gap: 4 }}>
                    <TText size={16}>{t('onboarding.linkInstead')}</TText>
                    <TText color="400" size={12}>
                        {t('onboarding.linkExplanation')}
                    </TText>
                </ListButton>
            </View>
            {busy && <ActivityIndicator color={color.primary._500} />}
        </Animated.View>
    )
}
export default LocalSetup
