import ThemedButton from '@components/buttons/ThemedButton'
import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useState } from 'react'
import { Text, TextInput, TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native'

type StringArrayEditorProps = {
    containerStyle?: ViewStyle
    title: string
    value: string[]
    setValue: (newdata: string[]) => void
    allowDuplicates?: boolean
    replaceNewLine?: string
    allowBlank?: string
}

const StringArrayEditor: React.FC<StringArrayEditorProps> = ({
    containerStyle = undefined,
    title,
    value,
    setValue,
    replaceNewLine = undefined,
    allowDuplicates = false,
    allowBlank = false,
}) => {
    const { color } = Theme.useTheme()
    const styles = useStyles()
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
        <View style={[styles.mainContainer, containerStyle]}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.contentContainer}>
                {value.length !== 0 && (
                    <View style={styles.tagContainer}>
                        {value.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.tag}
                                onPress={() => handleSplice(index)}>
                                <Text style={styles.tagText}>
                                    {item.replaceAll('\n', replaceNewLine ?? '\n')}
                                </Text>
                                <AntDesign name="close" size={16} color={color.text._400} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newData}
                        onChangeText={setNewData}
                        keyboardType="default"
                        multiline
                        placeholder="Enter value..."
                        placeholderTextColor={color.text._700}
                    />

                    <ThemedButton label="Add" onPress={() => addData(newData)} />
                </View>
            </View>
        </View>
    )
}

export default StringArrayEditor

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        mainContainer: {
            flex: 1,
        },

        contentContainer: {
            borderWidth: 1,
            color: color.text._100,
            borderColor: color.neutral._300,
            paddingHorizontal: spacing.s,
            paddingVertical: spacing.m,
            borderRadius: borderRadius.m,
        },

        title: {
            color: color.text._100,
            marginBottom: spacing.m,
        },

        tagContainer: {
            flexDirection: 'row',
            columnGap: spacing.m,
            rowGap: spacing.m,
            paddingBottom: spacing.m,
            marginBottom: spacing.m,
            borderBottomWidth: 1,
            borderColor: color.primary._200,
            flexWrap: 'wrap',
        },

        tag: {
            borderColor: color.primary._700,
            borderWidth: 1,
            paddingVertical: 8,
            paddingLeft: 12,
            paddingRight: 8,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },

        tagText: {
            color: color.text._100,
            marginRight: 8,
        },

        emptyTag: {
            color: color.text._400,
            paddingVertical: 4,
            paddingHorizontal: 12,
            fontStyle: 'italic',
        },

        input: {
            flex: 1,
            color: color.text._100,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 8,
        },

        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    })
}
