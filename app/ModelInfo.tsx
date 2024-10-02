import SliderItem from '@components/SliderItem'
import { GGMLNameMap, Llama, LlamaPreset, readableFileSize } from '@constants/LlamaLocal'
import { AntDesign } from '@expo/vector-icons'
import { Global, Style } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack } from 'expo-router'
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { useMMKVObject } from 'react-native-mmkv'
import Animated, {
    Easing,
    SlideInLeft,
    SlideInRight,
    SlideOutLeft,
    SlideOutRight,
} from 'react-native-reanimated'

type CPUFeatures = {
    armv8: boolean
    dotprod: boolean
    i8mm: boolean
}

const ModelInfo = () => {
    const { data } = useLiveQuery(Llama.getModelListQuery())

    const [cpuFeatures, setCpuFeatures] = useMMKVObject<CPUFeatures>(Global.CpuFeatures)
    const [showSettings, setShowSettings] = useState(false)
    const [preset, setPreset] = useMMKVObject<LlamaPreset>(Global.LocalPreset)

    const [modelLoading, setModelLoading] = useState(false)
    const [modelImporting, setModelImporting] = useState(false)

    const { loadModel, unloadModel, modelName, loadProgress, setloadProgress } = Llama.useLlama(
        (state) => ({
            loadModel: state.load,
            unloadModel: state.unload,
            modelName: state.modelname,
            loadProgress: state.loadProgress,
            setloadProgress: state.setLoadProgress,
        })
    )

    const renderItem = (item: (typeof data)[0]) => {
        //@ts-ignore
        const quant: string = item.quantization && GGMLNameMap[item.quantization]
        return (
            <View style={styles.modelContainer}>
                <Text style={styles.title}>{item.name}</Text>
                <View style={styles.tagContainer}>
                    <Text style={styles.tag}>
                        {item.params === 'N/A' ? 'No Param Size' : item.params}
                    </Text>
                    <Text style={styles.tag}>{quant}</Text>
                    <Text style={styles.tag}>{readableFileSize(item.file_size)}</Text>
                    <Text style={{ ...styles.tag, textTransform: 'capitalize' }}>
                        {item.architecture}
                    </Text>
                </View>
                <Text style={styles.subtitle}>Context Length: {item.context_length}</Text>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity>
                        <AntDesign
                            name="edit"
                            style={styles.button}
                            size={24}
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <AntDesign
                            name="delete"
                            style={styles.button}
                            size={24}
                            color={Style.getColor('destructive-brand')}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <AntDesign
                            name="play"
                            style={styles.button}
                            size={24}
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{ title: showSettings ? 'Model Settings' : 'Models', animation: 'fade' }}
            />

            {!showSettings && (
                <Animated.View
                    style={{ flex: 1 }}
                    entering={SlideInLeft.easing(Easing.inOut(Easing.cubic))}
                    exiting={SlideOutLeft.easing(Easing.inOut(Easing.cubic))}>
                    <View style={{ marginBottom: 16 }}>
                        <Text style={styles.title}>Supported Quantizations:</Text>
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

                    <FlatList
                        style={styles.list}
                        data={data}
                        renderItem={({ item }) => renderItem(item)}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </Animated.View>
            )}

            {showSettings && (
                <Animated.View
                    style={{ marginTop: 16, flex: 1 }}
                    entering={SlideInRight.easing(Easing.inOut(Easing.cubic))}
                    exiting={SlideOutRight.easing(Easing.inOut(Easing.cubic))}>
                    <SliderItem
                        name="Max Context"
                        body={preset}
                        setValue={setPreset}
                        varname="context_length"
                        min={1024}
                        max={32768}
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
                        max={512}
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
                </Animated.View>
            )}

            <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowSettings(!showSettings)}>
                <Text>{showSettings ? 'Back To Models' : 'Show Settings'}</Text>
            </TouchableOpacity>
        </View>
    )
}

export default ModelInfo

const styles = StyleSheet.create({
    mainContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        flex: 1,
    },

    list: {
        flex: 1,
    },

    modelContainer: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: Style.getColor('primary-surface2'),
        marginBottom: 12,
    },

    tagContainer: {
        paddingTop: 12,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
    },

    tag: {
        borderRadius: 4,
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 4,
        color: Style.getColor('primary-text2'),
    },

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

    title: {
        fontSize: 16,
        color: Style.getColor('primary-text1'),
    },

    modelTitle: {
        color: Style.getColor('primary-text1'),
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    buttonContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        marginTop: 12,
        borderColor: Style.getColor('primary-surface3'),
    },

    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 32,
    },

    settingsButton: {
        backgroundColor: Style.getColor('primary-brand'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
})
