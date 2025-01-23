import { AntDesign } from '@expo/vector-icons'
import { Style } from '@lib/utils/Global'
import React, { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native'

type StringArrayEditorProps = {
    style?: ViewStyle
    title: string
    value: string[]
    setValue: (newdata: string[]) => void
    allowDuplicates?: boolean
    replaceNewLine?: string
    allowBlank?: string
}

const StringArrayEditor: React.FC<StringArrayEditorProps> = ({
    style = undefined,
    title,
    value,
    setValue,
    replaceNewLine = undefined,
    allowDuplicates = false,
    allowBlank = false,
}) => {
    const [newData, setNewData] = useState('')

    const handleSplice = (index: number) => {
        setValue(value.filter((item, index2) => index2 !== index))
    }

    const addData = (newData: string) => {
        if (newData === '') return
        if (value.includes(newData)) return
        setNewData('')
        setValue([...value, newData])
    }

    return (
        <View style={[styles.mainContainer, style]}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.contentContainer}>
                <View style={styles.tagContainer}>
                    {value.length !== 0 &&
                        value.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.tag}
                                onPress={() => handleSplice(index)}>
                                <Text style={styles.tagText}>
                                    {item.replaceAll('\n', replaceNewLine ?? '\n')}
                                </Text>
                                <AntDesign
                                    name="close"
                                    size={16}
                                    color={Style.getColor('primary-text2')}
                                />
                            </TouchableOpacity>
                        ))}
                    {value.length === 0 && <Text style={styles.emptyTag}>{'<No Values>'}</Text>}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newData}
                        onChangeText={setNewData}
                        keyboardType="default"
                        multiline
                        placeholder="Enter value..."
                        placeholderTextColor={Style.getColor('primary-text3')}
                    />
                    <TouchableOpacity style={styles.button} onPress={() => addData(newData)}>
                        <Text style={styles.buttonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

export default StringArrayEditor

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },

    contentContainer: {
        borderRadius: 8,
    },

    title: {
        color: Style.getColor('primary-text1'),
        marginBottom: 12,
    },

    tagContainer: {
        flexDirection: 'row',
        columnGap: 8,
        rowGap: 8,
        flexWrap: 'wrap',
    },

    tag: {
        backgroundColor: Style.getColor('primary-surface4'),
        paddingVertical: 4,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },

    tagText: {
        color: Style.getColor('primary-text1'),
        marginRight: 8,
    },

    emptyTag: {
        color: Style.getColor('primary-text2'),
        paddingVertical: 4,
        paddingHorizontal: 12,
        fontStyle: 'italic',
    },

    input: {
        flex: 1,
        borderWidth: 1,
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface3'),
        marginTop: 12,
        marginBottom: 4,
        marginRight: 12,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    button: {
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor: Style.getColor('primary-brand'),
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },
})
