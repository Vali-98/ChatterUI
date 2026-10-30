import { getThreads } from '@vali98/react-native-cpu-info'
import { useFocusEffect } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, Platform } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { Easing, SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/appSettings'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { KV } from '@lib/engine/Local/Model'
import useBackendDevices from '@lib/hooks/BackendDevices'
import { Logger } from '@lib/state/Logger'
import { readableFileSize } from '@lib/utils/File'

type ModelSettingsProp = {
    modelImporting: boolean
    modelLoading: boolean
    exit: () => void
}

const deviceLabels = { GPUOpenCL: 'OpenCL', HTP0: 'Hexagon', CPU: 'CPU' }

const ModelSettings: React.FC<ModelSettingsProp> = ({ modelImporting, modelLoading, exit }) => {
    const { t } = useTranslation()
    const { config, setConfig } = Llama.useLlamaPreferencesStore(
        useShallow((state) => ({
            config: state.config,
            setConfig: state.setConfiguration,
        }))
    )

    const devices = useBackendDevices()

    const [saveKV, setSaveKV] = useMMKVBoolean(AppSettings.SaveLocalKV)
    const [autoloadLocal, setAutoloadLocal] = useMMKVBoolean(AppSettings.AutoLoadLocal)
    const [showModelInChat, setShowModelInChat] = useMMKVBoolean(AppSettings.ShowModelInChat)

    const [kvSize, setKVSize] = useState(0)

    const getKVSize = async () => {
        const size = await KV.getKVSize()
        setKVSize(size)
    }

    useEffect(() => {
        KV.getKVSize().then(setKVSize)
    }, [])

    const backAction = () => {
        exit()
        return true
    }

    useFocusEffect(() => {
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    })

    const handleDeleteKV = () => {
        Alert.alert({
            title: t('model.alert.deletekv.title'),
            description: t('model.alert.deletekv.description', { size: readableFileSize(kvSize) }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('model.alert.deletekv.title'),
                    onPress: async () => {
                        await KV.deleteKV()
                        Logger.info(t('model.toast.deletekv'))
                        getKVSize()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ rowGap: 8, paddingBottom: 24 }}
            entering={SlideInRight.easing(Easing.inOut(Easing.cubic))}
            exiting={SlideOutRight.easing(Easing.inOut(Easing.cubic))}>
            <SectionTitle>{t('model.settings.cpu')}</SectionTitle>
            {config && (
                <>
                    <ThemedSlider
                        label={t('model.maxcontext')}
                        value={config.context_length}
                        onValueChange={(value) => setConfig({ ...config, context_length: value })}
                        min={1024}
                        max={32768}
                        step={1024}
                        disabled={modelImporting || modelLoading}
                    />
                    <ThemedSlider
                        label={t('model.threads')}
                        value={config.threads}
                        onValueChange={(value) => setConfig({ ...config, threads: value })}
                        min={1}
                        max={getThreads()}
                        step={1}
                        disabled={modelImporting || modelLoading}
                    />

                    <ThemedSlider
                        label={t('model.batch')}
                        value={config.batch}
                        onValueChange={(value) => setConfig({ ...config, batch: value })}
                        min={16}
                        max={1024}
                        step={16}
                        disabled={modelImporting || modelLoading}
                    />

                    {(Platform.OS === 'ios' || devices.length > 1) && (
                        <ThemedSlider
                            label={t('model.gpulayers')}
                            value={config.gpu_layers}
                            onValueChange={(value) => setConfig({ ...config, gpu_layers: value })}
                            min={0}
                            max={100}
                            step={1}
                            disabled={modelImporting || modelLoading}
                        />
                    )}

                    <ThemedSwitchRow
                        label={t('model.contextshift')}
                        value={config.ctx_shift}
                        onChangeValue={(value) => {
                            setConfig({ ...config, ctx_shift: value })
                        }}
                    />

                    {devices.length > 1 && (
                        <HorizontalSelector
                            viewStyle={{ paddingBottom: 12 }}
                            label={t('model.backenddev')}
                            values={devices.map((item) => ({
                                label: deviceLabels[item as keyof typeof deviceLabels] ?? item,
                                value: item,
                            }))}
                            selected={config.devices?.[0]}
                            onPress={(value) => {
                                const devices = value === 'CPU' ? [value] : [value, 'CPU']
                                setConfig({ ...config, devices })
                            }}
                        />
                    )}
                </>
            )}
            <SectionTitle>{t('model.settings.advanced')}</SectionTitle>
            <ThemedSwitchRow
                label={t('model.modelnamechat')}
                value={showModelInChat}
                onChangeValue={setShowModelInChat}
            />
            <ThemedSwitchRow
                label={t('model.autoload')}
                value={autoloadLocal}
                onChangeValue={setAutoloadLocal}
            />
            <ThemedSwitchRow
                label={t('model.savekv')}
                value={saveKV}
                onChangeValue={setSaveKV}
                description={t('model.savekvdesc')}
            />
            {saveKV && (
                <ThemedButton
                    viewStyle={{ marginTop: 8 }}
                    label={t('model.purgekv', { size: readableFileSize(kvSize) })}
                    onPress={handleDeleteKV}
                    variant="secondary"
                    level="error"
                    disabled={kvSize === 0}
                />
            )}
        </Animated.ScrollView>
    )
}

export default ModelSettings
