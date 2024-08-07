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
import { Global, Color, API } from '@globals'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { SafeAreaView, Text, StyleSheet, View, ScrollView } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVString } from 'react-native-mmkv'

const APIMenu = () => {
    const [APIType, setAPIType] = useMMKVString(Global.APIType)
    const apinames = [
        { label: 'KoboldAI', value: API.KAI },
        { label: 'Text Generation Web UI', value: API.TGWUI },
        { label: 'Text Completions', value: API.COMPLETIONS },
        { label: 'Horde', value: API.HORDE },
        { label: 'Mancer', value: API.MANCER },
        { label: 'Open Router', value: API.OPENROUTER },
        { label: 'Local', value: API.LOCAL },
        { label: 'OpenAI', value: API.OPENAI },
        //{label: 'NovelAI', value:API.NOVELAI},
    ]

    useEffect(() => {
        if (APIType === undefined) setAPIType(API.KAI)
    }, [])

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: `API`,
                    animation: 'slide_from_left',
                }}
            />
            <ScrollView>
                <View style={styles.dropdownContainer}>
                    <Text style={{ color: Color.Text, fontSize: 16 }}>Type</Text>
                    <Dropdown
                        value={APIType}
                        style={styles.dropdownbox}
                        selectedTextStyle={styles.selected}
                        data={apinames}
                        labelField="label"
                        valueField="value"
                        onChange={(item) => {
                            if (item.value === APIType) return
                            setAPIType(item.value)
                        }}
                        containerStyle={styles.dropdownbox}
                        itemTextStyle={{ color: Color.Text }}
                        itemContainerStyle={{
                            backgroundColor: Color.DarkContainer,
                            borderRadius: 8,
                        }}
                        activeColor={Color.Container}
                        maxHeight={500}
                        placeholderStyle={{ color: Color.Offwhite }}
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
    )
}

export default APIMenu

const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: Color.Background,
        flex: 1,
    },

    dropdownContainer: {
        marginTop: 16,
        paddingHorizontal: 20,
    },

    dropdownbox: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
    },

    selected: {
        color: Color.Text,
    },
})
