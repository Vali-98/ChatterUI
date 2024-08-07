import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { InferenceSession, Tensor } from 'onnxruntime-react-native'

import * as FS from 'expo-file-system'
import { BertTokenizer } from 'bert-tokenizer'
import { Style } from '@globals'
import { ScrollView, TextInput } from 'react-native-gesture-handler'

const emotions = [
    'admiration',
    'amusement',
    'anger',
    'annoyance',
    'approval',
    'caring',
    'confusion',
    'curiosity',
    'desire',
    'disappointment',
    'disapproval',
    'disgust',
    'embarrassment',
    'excitement',
    'fear',
    'gratitude',
    'grief',
    'joy',
    'love',
    'nervousness',
    'optimism',
    'pride',
    'realization',
    'relief',
    'remorse',
    'sadness',
    'surprise',
    'neutral',
]

type infovalue = {
    emotion: string
    value: number
}

const classifier = () => {
    const [session, setSession] = useState<InferenceSession | undefined>(undefined)
    const [info, setInfo] = useState<infovalue[]>([])
    const [inputText, setInputText] = useState<string>('')
    const [timescore, settimescore] = useState<number>(0)
    const tokenizer = new BertTokenizer(
        'this text doesnt matter, the src is modified to use the default value',
        true
    )

    const loadSession = async () => {
        const session = await InferenceSession.create(
            `${FS.documentDirectory}models/classify/model_quantized.onnx`,
            { executionMode: 'parallel' }
        )
        setSession(session)
    }

    useEffect(() => {
        loadSession()
    }, [])

    const runClassifier = async () => {
        if (!session) return

        const tokenized = tokenizer.tokenize(inputText)

        const mask = new Array(tokenized.length).fill(1)
        const data = {
            input_ids: new Tensor('int64', tokenized, [1, tokenized.length]),
            attention_mask: new Tensor('int64', mask, [1, tokenized.length]),
        }

        const timer = performance.now()
        const result = session.run(data, ['logits'])

        const output = (await result).logits.data
        settimescore(performance.now() - timer)
        const info: infovalue[] = []
        output.forEach((value, index) => {
            const key = emotions[index]
            if (typeof value === 'number') info.push({ emotion: key, value: value })
        })
        info.sort((a, b) => b.value - a.value)
        setInfo(info)
    }

    return (
        <ScrollView style={Style.view.mainContainer}>
            <Text style={styles.text}>Classifier</Text>
            <TextInput
                multiline
                numberOfLines={5}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}></TextInput>
            <TouchableOpacity
                style={{ ...styles.input, alignItems: 'center', padding: 4 }}
                onPress={runClassifier}>
                <Text style={{ color: 'white' }}>Classify</Text>
            </TouchableOpacity>
            {timescore !== 0 && (
                <View
                    style={{
                        padding: 8,
                        backgroundColor: Style.getColor('primary-surface2'),
                        marginVertical: 2,
                    }}>
                    <Text style={{ color: 'white' }}>Time Taken: {timescore.toPrecision(4)}ms</Text>
                </View>
            )}

            {info.map((item, index) => (
                <View
                    key={index}
                    style={{
                        padding: 8,
                        backgroundColor: Style.getColor('primary-surface2'),
                        marginVertical: 1,
                    }}>
                    <Text style={styles.text}>Emotion: {item.emotion}</Text>
                    <Text style={styles.text}>Score: {item.value}</Text>
                </View>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    text: {
        color: Style.getColor('primary-text1'),
        paddingBottom: 8,
    },
    input: {
        borderColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        color: 'white',
        marginBottom: 16,
    },
})

export default classifier
