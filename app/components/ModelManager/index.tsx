import { Llama } from '@constants/LlamaLocal'
import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack } from 'expo-router'
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import * as Progress from 'react-native-progress'
import Animated, { Easing, SlideInLeft, SlideOutLeft } from 'react-native-reanimated'

import ModelEmpty from './ModelEmpty'
import ModelItem from './ModelItem'
import ModelNewMenu from './ModelNewMenu'
import ModelSettings from './ModelSettings'

const ModelManager = () => {
    const { data } = useLiveQuery(Llama.getModelListQuery())

    const [showSettings, setShowSettings] = useState(false)

    const [modelLoading, setModelLoading] = useState(false)
    const [modelImporting, setModelImporting] = useState(false)

    const { modelName, loadProgress, setloadProgress } = Llama.useLlama((state) => ({
        modelName: state.modelName,
        loadProgress: state.loadProgress,
        setloadProgress: state.setLoadProgress,
    }))

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: showSettings ? 'Model Settings' : 'Models',
                    animation: 'fade',
                    headerRight: () =>
                        !showSettings && (
                            <ModelNewMenu
                                modelImporting={modelImporting}
                                setModelImporting={setModelImporting}
                            />
                        ),
                }}
            />

            {!showSettings && (
                <Animated.View
                    style={{ flex: 1 }}
                    entering={SlideInLeft.easing(Easing.inOut(Easing.cubic))}
                    exiting={SlideOutLeft.easing(Easing.inOut(Easing.cubic))}>
                    <View style={styles.modelContainer}>
                        {!modelImporting && !modelLoading && data.length !== 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                }}>
                                <Text style={styles.subtitle}>Model Loaded: </Text>
                                <Text style={styles.modelTitle} ellipsizeMode="tail">
                                    {modelName ? modelName : 'None'}
                                </Text>
                            </View>
                        )}
                        {!modelImporting && !modelLoading && data.length === 0 && (
                            <View>
                                <Text style={styles.hint}>
                                    Hint: Press <AntDesign name="addfile" size={16} /> and import a
                                    GGUF model!
                                </Text>
                            </View>
                        )}

                        {!modelLoading && modelImporting && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Progress.Bar
                                    style={{ flex: 5 }}
                                    indeterminate
                                    indeterminateAnimationDuration={2000}
                                    color={Style.getColor('primary-brand')}
                                    borderColor={Style.getColor('primary-surface3')}
                                    height={12}
                                    borderRadius={12}
                                    width={null}
                                />

                                <Text
                                    style={{
                                        flex: 2,
                                        color: Style.getColor('primary-text1'),
                                        textAlign: 'center',
                                    }}>
                                    Importing...
                                </Text>
                            </View>
                        )}

                        {modelLoading && !modelImporting && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Progress.Bar
                                    style={{ flex: 5 }}
                                    progress={loadProgress / 100}
                                    color={Style.getColor('primary-brand')}
                                    borderColor={Style.getColor('primary-surface3')}
                                    height={12}
                                    borderRadius={12}
                                    width={null}
                                />
                                <Text
                                    style={{
                                        flex: 1,
                                        color: Style.getColor('primary-text1'),
                                        textAlign: 'center',
                                    }}>
                                    {loadProgress}%
                                </Text>
                            </View>
                        )}
                    </View>

                    {data.length === 0 && <ModelEmpty />}

                    <FlatList
                        style={styles.list}
                        data={data}
                        renderItem={({ item, index }) => (
                            <ModelItem
                                item={item}
                                index={index}
                                modelLoading={modelLoading}
                                setModelLoading={(b: boolean) => {
                                    if (b) setloadProgress(0)
                                    setModelLoading(b)
                                }}
                                modelImporting={modelImporting}
                            />
                        )}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </Animated.View>
            )}

            {showSettings && (
                <ModelSettings
                    modelImporting={modelImporting}
                    modelLoading={modelLoading}
                    exit={() => setShowSettings(false)}
                />
            )}

            <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowSettings(!showSettings)}>
                <Text>{showSettings ? 'Back To Models' : 'Show Settings'}</Text>
            </TouchableOpacity>
        </View>
    )
}

export default ModelManager

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

    hint: {
        marginBottom: 8,
        color: Style.getColor('primary-text2'),
    },

    settingsButton: {
        marginTop: 12,
        backgroundColor: Style.getColor('primary-brand'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
})
