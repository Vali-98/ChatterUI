import ThemedButton from '@components/buttons/ThemedButton'
import { AntDesign } from '@expo/vector-icons'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useState } from 'react'
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StyleSheet,
    ViewStyle,
    ScrollView,
} from 'react-native'

type StringArrayEditorProps = {
    containerStyle?: ViewStyle
    label?: string
    value: string[]
    setValue: (newdata: string[]) => void
    allowDuplicates?: boolean
    placeholder?: string
    replaceNewLine?: string
    allowBlank?: string
    suggestions?: string[]
    filterOnly?: boolean
    showSuggestionsOnEmpty?: boolean
}

const StringArrayEditor: React.FC<StringArrayEditorProps> = ({
    containerStyle = undefined,
    label = undefined,
    value,
    setValue,
    replaceNewLine = undefined,
    allowDuplicates = false,
    placeholder = 'Enter value...',
    allowBlank = false,
    suggestions = [],
    filterOnly = false,
    showSuggestionsOnEmpty = false,
}) => {
    const { color, borderRadius } = Theme.useTheme()
    const styles = useStyles()
    const [newData, setNewData] = useState('')
    const filteredSuggestions = suggestions.filter(
        (item) => item.toLowerCase().includes(newData.toLowerCase()) && !value.includes(item)
    )
    const handleSplice = (index: number) => {
        setValue(value.filter((item, index2) => index2 !== index))
    }

    const addData = (newData: string) => {
        if (newData === '') {
            Logger.warnToast('Value cannot be empty')
            return
        }
        if (value.includes(newData)) {
            Logger.warnToast('Value already exists')
            return
        }
        setNewData('')
        setValue([...value, newData])
    }

    return (
        <View style={[styles.mainContainer, containerStyle]}>
            {label && <Text style={styles.title}>{label}</Text>}

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
                {(newData || showSuggestionsOnEmpty) && filteredSuggestions.length > 0 && (
                    <View
                        style={{
                            marginBottom: 4,
                            flexDirection: 'row',
                            columnGap: 4,
                            alignItems: 'center',
                        }}>
                        {!filterOnly && (
                            <Text style={{ color: color.text._400, marginBottom: 4 }}>
                                Suggestions
                            </Text>
                        )}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            nestedScrollEnabled
                            style={{
                                borderRadius: borderRadius.m,
                            }}
                            contentContainerStyle={{
                                backgroundColor: color.neutral._100,
                                borderColor: color.neutral._200,
                                borderWidth: 1,
                                flexDirection: 'row',
                                columnGap: 8,
                            }}>
                            {filteredSuggestions.map((item, index) => (
                                <ThemedButton
                                    buttonStyle={{ paddingVertical: 4 }}
                                    onPress={() => addData(item)}
                                    variant="secondary"
                                    label={item}
                                    key={index}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newData}
                        onChangeText={setNewData}
                        keyboardType="default"
                        multiline
                        placeholder={placeholder}
                        placeholderTextColor={color.text._700}
                    />

                    {!filterOnly && <ThemedButton label="Add" onPress={() => addData(newData)} />}
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
            paddingVertical: 4,
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
            paddingHorizontal: 8,
            borderRadius: 8,
        },

        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    })
}
