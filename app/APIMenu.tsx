import ChatCompletions from '@components/Endpoint/ChatCompletions'
import Claude from '@components/Endpoint/Claude'
import Cohere from '@components/Endpoint/Cohere'
import Horde from '@components/Endpoint/Horde'
import KAI from '@components/Endpoint/KAI'
import Mancer from '@components/Endpoint/Mancer'
import Ollama from '@components/Endpoint/Ollama'
import OpenAI from '@components/Endpoint/OpenAI'
import OpenRouter from '@components/Endpoint/OpenRouter'
import TGWUI from '@components/Endpoint/TGWUI'
import TextCompletions from '@components/Endpoint/TextCompletions'
import FadeDownView from '@components/FadeDownView'
import { API, Global, Style } from 'constants/Global'
import { Stack } from 'expo-router'
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVString } from 'react-native-mmkv'

const APIMenu = () => {
    const [APIType, setAPIType] = useMMKVString(Global.APIType)
    const apinames = [
        { label: 'KoboldAI', value: API.KAI },
        { label: 'Text Generation Web UI', value: API.TGWUI },
        { label: 'Ollama', value: API.OLLAMA },

        { label: 'OpenAI', value: API.OPENAI },
        { label: 'Claude', value: API.CLAUDE },
        { label: 'Cohere', value: API.COHERE },
        { label: 'Open Router', value: API.OPENROUTER },
        { label: 'Mancer', value: API.MANCER },

        { label: 'Horde', value: API.HORDE },

        { label: 'Text Completions', value: API.COMPLETIONS },
        { label: 'Chat Completions', value: API.CHATCOMPLETIONS },
        //{label: 'NovelAI', value:API.NOVELAI},
    ]

    return (
        <FadeDownView style={{ flex: 1 }}>
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
                            API Type
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
                    {APIType === API.TGWUI && <TGWUI />}
                    {APIType === API.OLLAMA && <Ollama />}

                    {APIType === API.OPENAI && <OpenAI />}
                    {APIType === API.CLAUDE && <Claude />}
                    {APIType === API.COHERE && <Cohere />}
                    {APIType === API.OPENROUTER && <OpenRouter />}
                    {APIType === API.MANCER && <Mancer />}
                    {APIType === API.HORDE && <Horde />}

                    {APIType === API.COMPLETIONS && <TextCompletions />}
                    {APIType === API.CHATCOMPLETIONS && <ChatCompletions />}
                </ScrollView>
            </SafeAreaView>
        </FadeDownView>
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
