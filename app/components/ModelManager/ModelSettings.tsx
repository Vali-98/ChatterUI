import { Alert } from '@components/Alert'
import SectionTitle from '@components/SectionTitle'
import SliderItem from '@components/SliderItem'
import SwitchTitle from '@components/SwitchTitle'
import SwitchWithDescription from '@components/SwitchWithDescription'
import { Llama, LlamaPreset, readableFileSize } from '@constants/LlamaLocal'
import { AppSettings, Global, Logger, Style } from '@globals'
import { useFocusEffect } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Platform, View, Text, StyleSheet, BackHandler, TouchableOpacity } from 'react-native'
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import Animated, { SlideInRight, SlideOutRight, Easing } from 'react-native-reanimated'

type ModelSettingsProp = {
    modelImporting: boolean
    modelLoading: boolean
    exit: () => void
}

type CPUFeatures = {
    armv8: boolean
    dotprod: boolean
    i8mm: boolean
}

const ModelSettings: React.FC<ModelSettingsProp> = ({ modelImporting, modelLoading, exit }) => {
    const [preset, setPreset] = useMMKVObject<LlamaPreset>(Global.LocalPreset)
    const [cpuFeatures, setCpuFeatures] = useMMKVObject<CPUFeatures>(Global.CpuFeatures)

    const [saveKV, setSaveKV] = useMMKVBoolean(AppSettings.SaveLocalKV)
    const [autoloadLocal, setAutoloadLocal] = useMMKVBoolean(AppSettings.AutoLoadLocal)

    const [kvSize, setKVSize] = useState(0)

    const getKVSize = async () => {
        const size = await Llama.getKVSize()
        setKVSize(size)
    }

    useEffect(() => {
        getKVSize()
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
            title: 'Delete KV Cache',
            description: `Are you sure you want to delete the KV Cache? This cannot be undone. \n\n This will clear up ${readableFileSize(kvSize)} of space.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete KV Cache',
                    onPress: async () => {
                        await Llama.deleteKV()
                        Logger.log('KV Cache deleted!', true)
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
            entering={SlideInRight.easing(Easing.inOut(Easing.cubic))}
            exiting={SlideOutRight.easing(Easing.inOut(Easing.cubic))}>
            <View style={{ marginBottom: 16 }}>
                <SectionTitle>Supported Quantizations</SectionTitle>
                <View
                    style={{
                        flexDirection: 'row',
                        columnGap: 8,
                        marginTop: 8,
                    }}>
                    <Text style={cpuFeatures?.dotprod ? styles.greenTag : styles.redTag}>
                        Q4_0_4_4 {!cpuFeatures?.dotprod && 'Not '}Available
                    </Text>
                    <Text style={cpuFeatures?.i8mm ? styles.greenTag : styles.redTag}>
                        Q4_0_4_8 {!cpuFeatures?.i8mm && 'Not '}Available
                    </Text>
                </View>
            </View>

            <SectionTitle>CPU Settings</SectionTitle>
            <View style={{ marginTop: 16 }} />
            <SliderItem
                name="Max Context"
                body={preset}
                setValue={setPreset}
                varname="context_length"
                min={1024}
                max={131072}
                step={1024}
                disabled={modelImporting || modelLoading}
            />
            <SliderItem
                name="Threads"
                body={preset}
                setValue={setPreset}
                varname="threads"
                min={1}
                max={8}
                step={1}
                disabled={modelImporting || modelLoading}
            />

            <SliderItem
                name="Batch"
                body={preset}
                setValue={setPreset}
                varname="batch"
                min={16}
                max={4096}
                step={16}
                disabled={modelImporting || modelLoading}
            />
            {/* Note: llama.rn does not have any Android gpu acceleration */}
            {Platform.OS === 'ios' && (
                <SliderItem
                    name="GPU Layers"
                    body={preset}
                    setValue={setPreset}
                    varname="gpu_layers"
                    min={0}
                    max={100}
                    step={1}
                />
            )}

            <SectionTitle>Advanced Settings</SectionTitle>

            <SwitchTitle
                title="Automatically Load Model on Chat"
                value={autoloadLocal}
                onValueChange={setAutoloadLocal}
            />

            <SwitchWithDescription
                title="Save Local KV"
                value={saveKV}
                onValueChange={setSaveKV}
                description={
                    saveKV
                        ? ''
                        : 'Saves the KV cache on generations, allowing you to continue sessions after closing the app. Must use the same model for this to function properly. Saving the KV cache file may be very big and negatively impact battery life!'
                }
            />

            {saveKV && (
                <TouchableOpacity
                    onPress={handleDeleteKV}
                    disabled={kvSize === 0}
                    style={kvSize === 0 ? styles.purgeButtonDisabled : styles.purgeButton}>
                    <Text
                        style={{
                            color: Style.getColor(kvSize === 0 ? 'primary-text3' : 'primary-text1'),
                        }}>
                        Purge KV Cache {'(' + readableFileSize(kvSize) + ')'}
                    </Text>
                </TouchableOpacity>
            )}
        </Animated.ScrollView>
    )
}

export default ModelSettings

const styles = StyleSheet.create({
    greenTag: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('confirm-brand'),
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },

    redTag: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('destructive-brand'),
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingTop: 4,
        paddingBottom: 8,
    },

    purgeButton: {
        marginTop: 12,
        backgroundColor: Style.getColor('destructive-brand'),
        borderWidth: 1,
        borderColor: Style.getColor('destructive-brand'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },

    purgeButtonDisabled: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: Style.getColor('primary-text3'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
})
