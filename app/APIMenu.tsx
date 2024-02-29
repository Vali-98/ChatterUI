import {
    KAI,
    Horde,
    TGWUI,
    Mancer,
    TextCompletions,
    Local,
    OpenRouter,
    OpenAI,
} from '@components/Endpoint'
import { Global, API, Style } from '@globals'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaView, Text, StyleSheet, View, ScrollView } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVString } from 'react-native-mmkv'
import AnimatedView from '@components/AnimatedView'
const APIMenu = () => {
    const [APIType, setAPIType] = useMMKVString(Global.APIType)
    const apinames = [
        { label: 'Local', value: API.LOCAL },
        { label: 'KoboldAI', value: API.KAI },
        { label: 'Text Generation Web UI', value: API.TGWUI },
        { label: 'Text Completions', value: API.COMPLETIONS },
        { label: 'Horde', value: API.HORDE },
        { label: 'Mancer', value: API.MANCER },
        { label: 'Open Router', value: API.OPENROUTER },
        { label: 'OpenAI', value: API.OPENAI },
        //{label: 'NovelAI', value:API.NOVELAI},
    ]

    useEffect(() => {
        if (APIType === undefined) setAPIType(API.KAI)
    }, [])

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <SafeAreaView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        title: `API`,
                        animation: 'fade',
                    }}
                />
                <ScrollView>
                    <View style={styles.dropdownContainer}>
                        <Text
                            style={{
                                color: Style.getColor('primary-text1'),
                                fontSize: 16,
                                marginBottom: 8,
                            }}>
                            Type
                        </Text>
                        <Dropdown
                            value={APIType}
                            data={apinames}
                            labelField="label"
                            valueField="value"
                            onChange={(item) => {
                                if (item.value === APIType) return
                                setAPIType(item.value)
                            }}
                            maxHeight={500}
                            {...Style.drawer.default}
                        />
                    </View>
                    {APIType === API.KAI && <KAI />}
                    {APIType === API.HORDE && <Horde />}
                    {APIType === API.TGWUI && <TGWUI />}
                    {APIType === API.MANCER && <Mancer />}
                    {APIType === API.COMPLETIONS && <TextCompletions />}
                    {APIType === API.LOCAL && <Local />}
                    {APIType === API.OPENROUTER && <OpenRouter />}
                    {APIType === API.OPENAI && <OpenAI />}
                </ScrollView>
            </SafeAreaView>
        </AnimatedView>
    )
}

export default APIMenu

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },

    dropdownContainer: {
        marginTop: 16,
        paddingHorizontal: 20,
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },
})
