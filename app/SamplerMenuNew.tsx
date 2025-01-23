import CheckboxTitle from '@components/input/CheckboxTitle'
import SliderInput from '@components/input/SliderInput'
import TextBox from '@components/input/TextBox'
import Alert from '@components/views/Alert'
import FadeDownView from '@components/views/FadeDownView'
import TextBoxModal from '@components/views/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { AppMode, AppSettings } from '@lib/constants/GlobalValues'
import { Samplers } from '@lib/constants/SamplerData'
import { APIState as APIStateNew } from '@lib/engine/API/APIManagerState'
import { APIState } from '@lib/engine/APILegacy'
import { APISampler } from '@lib/engine/APILegacy/BaseAPI'
import { SamplersManager } from '@lib/storage/SamplerState'
import { API, Global, Logger, saveStringToDownload, Style } from '@lib/utils/Global'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'

type PresetLabel = {
    label: string
}

const SamplerMenu = () => {
    const [APIType, setAPIType] = useMMKVString(Global.APIType)
    const [appMode, setAppMode] = useMMKVString(Global.AppMode)
    const [showNewPreset, setShowNewPreset] = useState<boolean>(false)

    const {
        addSamplerConfig,
        deleteSamplerConfig,
        changeConfig,
        updateCurrentConfig,
        currentConfigIndex,
        currentConfig,
        configList,
    } = SamplersManager.useSamplers()

    useEffect(() => {
        setSamplerList(getSamplerList())
    }, [])

    const [legacy, setLegacy] = useMMKVBoolean(AppSettings.UseLegacyAPI)
    const { apiValues, activeIndex, getTemplates } = APIStateNew.useAPIState((state) => ({
        apiValues: state.values,
        activeIndex: state.activeIndex,
        getTemplates: state.getTemplates,
    }))

    const [samplerList, setSamplerList] = useState<APISampler[]>([])

    const getSamplerList = (): APISampler[] => {
        if (appMode === AppMode.LOCAL) return APIState[API.LOCAL].samplers
        if (legacy) {
            return APIState[APIType as API].samplers
        }
        if (activeIndex !== -1) {
            const template = getTemplates().find(
                (item) => item.name === apiValues[activeIndex].configName
            )
            if (!template) return []
            return template.request.samplerFields
        }
        return []
    }

    return (
        <FadeDownView style={{ flex: 1 }}>
            <SafeAreaView>
                <TextBoxModal
                    booleans={[showNewPreset, setShowNewPreset]}
                    onConfirm={(text: string) => {
                        if (text === '') {
                            Logger.log(`Preset name cannot be empty`, true)
                            return
                        }

                        for (const item of configList)
                            if (item.name === text) {
                                Logger.log(`Preset name already exists.`, true)
                                return
                            }
                        addSamplerConfig({ name: text, data: currentConfig.data })
                    }}
                />

                <Stack.Screen
                    options={{
                        animation: 'fade',
                        title: `Samplers`,
                    }}
                />

                <View style={styles.dropdownContainer}>
                    <Dropdown
                        value={currentConfig.name}
                        data={configList}
                        valueField="name"
                        labelField="name"
                        onChange={(item) => {
                            if (item.name === currentConfig.name) return
                            changeConfig(configList.indexOf(item))
                        }}
                        {...Style.drawer.default}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            //TODO: this may no longer be needed
                        }}>
                        <FontAwesome
                            size={24}
                            name="save"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            if (configList.length === 1) {
                                Logger.log(`Cannot Delete Last Preset.`, true)
                                return
                            }

                            Alert.alert({
                                title: `Delete Preset`,
                                description: `Are you sure you want to delete '${currentConfig.name}'?`,
                                buttons: [
                                    { label: 'Cancel' },
                                    {
                                        label: 'Delete Preset',
                                        onPress: async () => {
                                            deleteSamplerConfig(currentConfigIndex)
                                        },
                                        type: 'warning',
                                    },
                                ],
                            })
                        }}>
                        <FontAwesome
                            size={24}
                            name="trash"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            //`TODO`: new routine
                        }}>
                        <FontAwesome
                            size={24}
                            name="upload"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={async () => {
                            saveStringToDownload(
                                JSON.stringify(currentConfig.data),
                                `${currentConfig.name}.json`,
                                'utf8'
                            ).then(() => {
                                Logger.log('Downloaded Sampler Preset!', true)
                            })
                        }}>
                        <FontAwesome
                            size={24}
                            name="download"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            setShowNewPreset(true)
                        }}>
                        <FontAwesome
                            size={24}
                            name="plus"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <View style={styles.mainContainer}>
                        {currentConfig &&
                            samplerList?.map((item, index) => {
                                const samplerItem = Samplers?.[item.samplerID]
                                if (!samplerItem)
                                    return (
                                        <Text style={styles.unsupported}>
                                            Sampler ID {`[${item.samplerID}]`} Not Supported
                                        </Text>
                                    )
                                switch (samplerItem.inputType) {
                                    case 'slider':
                                        return (
                                            (samplerItem.values.type === 'float' ||
                                                samplerItem.values.type === 'integer') && (
                                                <SliderInput
                                                    key={item.samplerID}
                                                    value={
                                                        currentConfig.data[
                                                            samplerItem.internalID
                                                        ] as number
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
                                            <CheckboxTitle
                                                value={
                                                    currentConfig.data[item.samplerID] as boolean
                                                }
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
                                                name={samplerItem.friendlyName}
                                            />
                                        )
                                    case 'textinput':
                                        return (
                                            <TextBox
                                                key={item.samplerID}
                                                varname={samplerItem.internalID}
                                                body={currentConfig.data}
                                                setValue={(data) => {
                                                    updateCurrentConfig({
                                                        ...currentConfig,
                                                        data: data,
                                                    })
                                                }}
                                                name={samplerItem.friendlyName}
                                            />
                                        )
                                    //case 'custom':
                                    default:
                                        return (
                                            <Text style={styles.warningText}>
                                                Invalid Sampler Field!
                                            </Text>
                                        )
                                }
                            })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </FadeDownView>
    )
}

export default SamplerMenu

const styles = StyleSheet.create({
    mainContainer: {
        margin: 16,
        paddingBottom: 150,
    },

    dropdownContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        flexDirection: 'row',
        paddingBottom: 12,
        alignItems: 'center',
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },

    button: {
        padding: 5,
        borderRadius: 4,
        marginLeft: 8,
    },

    input: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        marginHorizontal: 4,
        borderRadius: 8,
    },
    warningText: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('destructive-brand'),
        padding: 8,
        margin: 16,
        borderRadius: 8,
    },

    unsupported: {
        color: Style.getColor('primary-text2'),
        textAlign: 'center',
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
    },
})
