import { View, Text, TouchableOpacity } from 'react-native'
import { ColorId, Style } from '@constants/Style'
import Slider from '@react-native-community/slider'
import { ScrollView } from 'react-native-gesture-handler'
import { LlamaTokenizer } from '@globals'

const ColorTest = () => {
    const { color, setPrimary } = Style.useColorScheme((state) => ({
        color: state.colors.primary,
        setPrimary: state.setPrimary,
    }))

    const surfaces: ColorId[] = [
        'primary-surface1',
        'primary-surface2',
        'primary-surface3',
        'primary-surface4',
        'primary-brand',
    ]

    const lorem1 =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '

    return (
        <ScrollView
            style={{ backgroundColor: Style.getColor('primary-surface1'), flex: 1, padding: 16 }}>
            {/*<View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: Style.getColor('primary-text1') }}>Toggle Dark Mode</Text>
                <Switch
                    value={darkMode}
                    onValueChange={toggleDarkMode}
                    thumbColor={Style.getColor(darkMode ? 'primary-brand' : 'primary-surface1')}
                    trackColor={{
                        true: Style.getColor('primary-surface3'),
                        false: Style.getColor('primary-surface3'),
                    }}
                />
                </View>*/}
            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: Style.getColor('primary-text1') }}>Hue: {color.h}</Text>
                <Slider
                    minimumValue={0}
                    maximumValue={360}
                    style={{ flex: 1 }}
                    step={1}
                    value={color.h}
                    onValueChange={(value) => {
                        setPrimary(value, color.s, color.l)
                    }}
                    maximumTrackTintColor={Style.getColor('primary-surface2')}
                    minimumTrackTintColor={Style.getColor('primary-brand')}
                    thumbTintColor={Style.getColor('primary-brand')}
                />
            </View>

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
            <View>
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
                    </View>
                </View>
            </View>
        </ScrollView>
    )
}

export default ColorTest
