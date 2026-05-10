import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import DropdownSheet from '@components/input/DropdownSheet'
import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { SamplerID, Samplers } from '@lib/constants/SamplerData'
import { APIConfiguration, APISampler } from '@lib/engine/API/APIBuilder.types'
import { APIManager as APIStateNew } from '@lib/engine/API/APIManagerState'
import { localSamplerData } from '@lib/engine/LocalInference'
import { useAppMode } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { SamplersManager } from '@lib/state/SamplerState'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'

import ContextLimitPreview from './ContextLimitPreview'

const SamplerManagerScreen = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const { spacing } = Theme.useTheme()
    const { appMode } = useAppMode()
    const [showNewSampler, setShowNewSampler] = useState<boolean>(false)

    const {
        addSamplerConfig,
        deleteSamplerConfig,
        changeConfig,
        updateCurrentConfig,
        currentConfigIndex,
        currentConfig,
        configList,
    } = SamplersManager.useSamplers()

    const { apiValues, activeIndex, getTemplates } = APIStateNew.useConnectionsStore(
        useShallow((state) => ({
            apiValues: state.values,
            activeIndex: state.activeIndex,
            getTemplates: state.getTemplates,
        }))
    )

    const getSamplerList = (): APISampler[] => {
        if (appMode === 'local') return localSamplerData
        if (activeIndex !== -1) {
            const template = getTemplates().find(
                (item: APIConfiguration) => item.name === apiValues[activeIndex].configName
            )
            if (!template) return []
            return template.request.samplerFields
        }
        return []
    }

    const handleExportSampler = () => {
        saveStringToDownload(
            JSON.stringify(currentConfig.data),
            `${currentConfig.name}.json`,
            'utf8'
        ).then(() => {
            Logger.infoToast(t('sampler.toast.exportok'))
        })
    }

    const handleDeleteSampler = () => {
        if (configList.length === 1) {
            Logger.errorToast(t('sampler.toast.lastconfig'))
            return false
        }

        Alert.alert({
            title: t('sampler.alert.delete.title'),
            description: t('sampler.alert.delete.description', { name: currentConfig.name }),
            buttons: [
                { label: t('common.cancel') },
                {
                    label: t('sampler.alert.delete.title'),
                    onPress: async () => {
                        deleteSamplerConfig(currentConfigIndex)
                    },
                    type: 'warning',
                },
            ],
        })
        return true
    }

    const samplerList = getSamplerList()

    const headerRight = () => (
        <ContextMenu
            triggerIcon="setting"
            triggerIconSize={24}
            placement="bottom"
            buttons={[
                {
                    label: t('sampler.create'),
                    icon: 'file-add',
                    onPress: (close) => {
                        setShowNewSampler(true)
                        close()
                    },
                },
                {
                    label: t('sampler.export'),
                    icon: 'download',
                    onPress: (close) => {
                        handleExportSampler()
                        close()
                    },
                },
                /*{
                    label: 'Import Sampler',
                    icon: 'upload',
                    onPress: (close) => {
                        handleImportSampler()
                        close()
                    },
                },*/
                {
                    label: t('sampler.delete'),
                    icon: 'delete',
                    onPress: (close) => {
                        if (handleDeleteSampler()) close()
                    },
                    variant: 'warning',
                },
            ]}
        />
    )

    return (
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }} key={currentConfig.name}>
            <InputSheet
                title={t('sampler.new')}
                visible={showNewSampler}
                setVisible={setShowNewSampler}
                onConfirm={(text: string) => {
                    if (text === '') {
                        Logger.errorToast(t('sampler.toast.emptyname'))
                        return
                    }

                    for (const item of configList)
                        if (item.name === text) {
                            Logger.errorToast(t('sampler.toast.exists'))
                            return
                        }
                    addSamplerConfig({ name: text, data: currentConfig.data })
                }}
            />

            <HeaderTitle title={t('sampler.title')} />
            <HeaderButton headerRight={headerRight} />

            <DropdownSheet
                containerStyle={{ marginHorizontal: spacing.xl, paddingVertical: spacing.m }}
                selected={currentConfig}
                data={configList}
                onChangeValue={(item) => {
                    if (item.name === currentConfig.name) return
                    changeConfig(configList.indexOf(item))
                }}
                labelExtractor={(item) => item.name}
            />

            {samplerList.length !== 0 && currentConfig && (
                <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer}>
                    {samplerList.some((item) => item.samplerID === SamplerID.GENERATED_LENGTH) && (
                        <ContextLimitPreview
                            generatedLength={currentConfig.data[SamplerID.GENERATED_LENGTH]}
                        />
                    )}
                    {samplerList.map((item) => {
                        const samplerItem = Samplers?.[item.samplerID]
                        if (!samplerItem)
                            return (
                                <Text key={item.samplerID} style={styles.unsupported}>
                                    {t('sampler.notSupported', { id: item.samplerID })}
                                </Text>
                            )
                        switch (samplerItem.inputType) {
                            case 'slider':
                                return (
                                    (samplerItem.values.type === 'float' ||
                                        samplerItem.values.type === 'integer') && (
                                        <ThemedSlider
                                            key={item.samplerID}
                                            value={
                                                currentConfig.data[samplerItem.internalID] as number
                                            }
                                            onValueChange={(value) => {
                                                updateCurrentConfig({
                                                    ...currentConfig,
                                                    data: {
                                                        ...currentConfig.data,
                                                        [samplerItem.internalID]: value,
                                                    },
                                                })
                                            }}
                                            label={samplerItem.friendlyName}
                                            min={samplerItem.values.min}
                                            max={samplerItem.values.max}
                                            step={samplerItem.values.step}
                                            precision={samplerItem.values.precision ?? 2}
                                        />
                                    )
                                )
                            case 'checkbox':
                                return (
                                    <ThemedCheckbox
                                        value={currentConfig.data[item.samplerID] as boolean}
                                        key={item.samplerID}
                                        onChangeValue={(b) => {
                                            updateCurrentConfig({
                                                ...currentConfig,
                                                data: {
                                                    ...currentConfig.data,
                                                    [samplerItem.internalID]: b,
                                                },
                                            })
                                        }}
                                        label={samplerItem.friendlyName}
                                    />
                                )
                            case 'textinput':
                                return (
                                    <ThemedTextInput
                                        key={item.samplerID}
                                        value={currentConfig.data[item.samplerID] as string}
                                        onChangeText={(text) => {
                                            updateCurrentConfig({
                                                ...currentConfig,
                                                data: {
                                                    ...currentConfig.data,
                                                    [item.samplerID]: text,
                                                },
                                            })
                                        }}
                                        label={samplerItem.friendlyName}
                                    />
                                )
                            case 'selector':
                                return (
                                    <HorizontalSelector
                                        key={item.samplerID}
                                        label={samplerItem.friendlyName}
                                        values={samplerItem.values.values.map((item) => ({
                                            label: item.charAt(0).toUpperCase() + item.slice(1),
                                            value: item,
                                        }))}
                                        selected={currentConfig.data[item.samplerID]}
                                        onPress={(text) => {
                                            updateCurrentConfig({
                                                ...currentConfig,
                                                data: {
                                                    ...currentConfig.data,
                                                    [item.samplerID]: text,
                                                },
                                            })
                                        }}
                                    />
                                )
                            //case 'custom':
                            default:
                                return (
                                    <Text style={styles.warningText}>{t('sampler.invalid')}</Text>
                                )
                        }
                    })}
                </KeyboardAwareScrollView>
            )}
            {samplerList.length === 0 && (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        rowGap: 12,
                    }}>
                    <Text style={styles.noSamplersText}>{t('sampler.empty')}</Text>
                    {appMode === 'remote' && (
                        <Text style={styles.noSamplersText}>{t('sampler.nosamplers')}</Text>
                    )}
                </View>
            )}
        </SafeAreaView>
    )
}

export default SamplerManagerScreen

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        scrollContainer: {
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xl2,
            rowGap: spacing.xl,
        },

        dropdownContainer: {
            marginHorizontal: spacing.xl,
        },

        button: {
            padding: spacing.s,
            borderRadius: spacing.s,
            marginLeft: spacing.m,
        },

        warningText: {
            color: color.text._100,
            backgroundColor: color.error._500,
            padding: spacing.m,
            margin: spacing.xl,
            borderRadius: spacing.m,
        },

        unsupported: {
            color: color.text._400,
            textAlign: 'center',
            paddingVertical: spacing.m,
            marginVertical: spacing.m,
            borderRadius: spacing.m,
            backgroundColor: color.neutral._300,
        },

        noSamplersText: {
            color: color.text._400,
        },
    })
}
