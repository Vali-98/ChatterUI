import { AppSettings } from '@constants/GlobalValues'
import { ColorId, Style } from '@constants/Style'
import { FontAwesome } from '@expo/vector-icons'
import { LlamaTokenizer } from '@globals'
import Slider from '@react-native-community/slider'
import { reloadAppAsync } from 'expo'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { View, Text, TouchableOpacity, Switch } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useMMKVBoolean } from 'react-native-mmkv'

const ColorTest = () => {
    const { color, setPrimary, toggleDarkMode, darkMode } = Style.useColorScheme((state) => ({
        color: state.colors.primary,
        setPrimary: state.setPrimary,
        toggleDarkMode: state.toggleDarkMode,
        darkMode: state.darkMode,
    }))
    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)

    const surfaces: ColorId[] = [
        'primary-surface1',
        'primary-surface2',
        'primary-surface3',
        'primary-surface4',
        'primary-brand',
    ]

    const lorem1 =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '

    const [edited, setEdited] = useState(false)
    return (
        <View style={{ backgroundColor: Style.getColor('primary-surface1'), flex: 1, padding: 16 }}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() =>
                                setPrimary(
                                    Style.defaultBrandColor.h,
                                    Style.defaultBrandColor.s,
                                    Style.defaultBrandColor.l
                                )
                            }>
                            <FontAwesome
                                name="refresh"
                                color={Style.getColor('primary-text1')}
                                size={24}
                            />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View style={{ alignItems: 'center', flexDirection: 'row', marginVertical: 8 }}>
                <Switch
                    value={darkMode}
                    onValueChange={(value) => {
                        setEdited(true)
                        toggleDarkMode()
                    }}
                    thumbColor={Style.getColor(darkMode ? 'primary-brand' : 'primary-surface1')}
                    trackColor={{
                        true: Style.getColor('primary-surface3'),
                        false: Style.getColor('primary-surface3'),
                    }}
                />

                <Text style={{ color: Style.getColor('primary-text1') }}>
                    Toggle Dark Mode [ VERY EXPERIMENTAL ]
                </Text>
            </View>
            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: Style.getColor('primary-text1') }}>Hue: {color.h}</Text>
                <Slider
                    minimumValue={1}
                    maximumValue={360}
                    style={{ flex: 1 }}
                    step={1}
                    value={color.h}
                    onValueChange={(value) => {
                        setEdited(true)
                        setPrimary(value, color.s, color.l)
                    }}
                    maximumTrackTintColor={Style.getColor('primary-surface2')}
                    minimumTrackTintColor={Style.getColor('primary-brand')}
                    thumbTintColor={Style.getColor('primary-brand')}
                />
            </View>

            {!devMode && (
                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                    <Text style={{ color: Style.getColor('primary-text1') }}>Sat: {color.s}</Text>
                    <Slider
                        minimumValue={0}
                        maximumValue={100}
                        style={{ flex: 1 }}
                        step={1}
                        value={color.s}
                        onValueChange={(value) => {
                            setPrimary(color.h, value, color.l)
                        }}
                        maximumTrackTintColor={Style.getColor('primary-surface2')}
                        minimumTrackTintColor={Style.getColor('primary-brand')}
                        thumbTintColor={Style.getColor('primary-brand')}
                    />
                </View>
            )}
            {!devMode && (
                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                    <Text style={{ color: Style.getColor('primary-text1') }}>Lit: {color.l}</Text>
                    <Slider
                        minimumValue={0}
                        maximumValue={100}
                        style={{ flex: 1 }}
                        step={1}
                        value={color.l}
                        onValueChange={(value) => {
                            setPrimary(color.h, color.s, value)
                        }}
                        maximumTrackTintColor={Style.getColor('primary-surface2')}
                        minimumTrackTintColor={Style.getColor('primary-brand')}
                        thumbTintColor={Style.getColor('primary-brand')}
                    />
                </View>
            )}
            {edited && (
                <View>
                    <Text style={{ color: Style.getColor('destructive-brand'), marginTop: 8 }}>
                        Restart ChatterUI to apply changes!
                    </Text>
                    <TouchableOpacity
                        style={{
                            marginVertical: 8,
                            borderColor: Style.getColor('primary-brand'),
                            borderRadius: 4,
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderWidth: 1,
                        }}
                        onPress={() => {
                            reloadAppAsync()
                        }}>
                        <Text style={{ color: Style.getColor('primary-text1') }}>Restart Now</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView>
                <View style={{ marginTop: 8 }}>
                    {surfaces.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={async () => {
                                const start = performance.now()
                                const tokens1 = LlamaTokenizer.encode(lorem1)
                                const final = performance.now() - start
                                console.log(
                                    'Took',
                                    final.toFixed(2),
                                    'ms to encode locally. It has',
                                    tokens1.length,
                                    'tokens'
                                )
                                const start2 = performance.now()
                                const response = await fetch(
                                    'http://10.0.2.2:4050/api/extra/tokencount',
                                    {
                                        method: 'POST',
                                        body: JSON.stringify({ prompt: lorem1 }),
                                    }
                                )
                                const { ids } = await response.json()
                                const final2 = performance.now() - start
                                console.log(
                                    'Took',
                                    final2.toFixed(2),
                                    'ms to encode remotely. It has',
                                    ids.length,
                                    'tokens'
                                )
                            }}
                            style={{
                                marginTop: 8,
                                padding: 12,
                                backgroundColor: Style.getColor(item),
                                shadowColor: 'black',
                                shadowOpacity: 1,
                                shadowRadius: 0,
                                shadowOffset: { width: 0, height: 20 },
                                elevation: 5,
                                borderRadius: 8,
                                borderColor: Style.getColor('primary-surface1'),
                                borderWidth: 1,
                            }}>
                            <Text style={{ color: Style.getColor('primary-text1') }}>
                                {index === surfaces.length - 1 ? 'Brand' : `Surface ${index + 1}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <View style={{ marginTop: 20 }}>
                        <Text
                            style={{
                                fontSize: 16,
                                color: Style.getColor('primary-text1'),
                                borderColor: Style.getColor('primary-surface3'),
                                borderBottomWidth: 1,
                                padding: 2,
                                marginBottom: 2,
                            }}>
                            Text 1
                        </Text>
                        <Text style={{ color: Style.getColor('primary-text1') }}>{lorem1}</Text>
                        <Text
                            style={{
                                marginTop: 12,
                                fontSize: 16,
                                color: Style.getColor('primary-text2'),
                                borderColor: Style.getColor('primary-surface3'),
                                borderBottomWidth: 1,
                                padding: 2,
                                marginBottom: 2,
                            }}>
                            Text 2
                        </Text>
                        <Text style={{ color: Style.getColor('primary-text2') }}>{lorem1}</Text>
                        <Text
                            style={{
                                marginTop: 12,
                                fontSize: 16,
                                color: Style.getColor('primary-text3'),
                                borderColor: Style.getColor('primary-surface3'),
                                borderBottomWidth: 1,
                                padding: 2,
                                marginBottom: 2,
                            }}>
                            Text 3
                        </Text>
                        <Text style={{ color: Style.getColor('primary-text3') }}>{lorem1}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

export default ColorTest
