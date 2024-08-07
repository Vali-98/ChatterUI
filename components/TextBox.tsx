import { Style } from '@globals'
import { View, Text, StyleSheet, TextInput, KeyboardTypeOptions } from 'react-native'

type TextBoxProps = {
    name: string
    body: any
    varname: string
    setValue: (item: any) => void
    lines?: number
    keyboardType?: KeyboardTypeOptions
    multiline?: boolean
}

const TextBox: React.FC<TextBoxProps> = ({
    name,
    body,
    varname,
    setValue,
    lines = 1,
    keyboardType = 'default',
    multiline = false,
}) => {
    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>{name}</Text>
            <TextInput
                multiline={lines > 1 || multiline}
                numberOfLines={lines}
                style={{
                    ...styles.input,
                    textAlignVertical: lines > 1 ? `top` : `center`,
                }}
                value={body[varname]?.toString() ?? ''}
                onChangeText={(value) => {
                    setValue({ ...body, [varname]: value })
                }}
                placeholder="----"
                placeholderTextColor={Style.getColor('primary-text2')}
                keyboardType={keyboardType}
            />
        </View>
    )
}

export default TextBox

const styles = StyleSheet.create({
    mainContainer: {
        paddingBottom: 8,
        flex: 1,
    },

    title: {
        color: Style.getColor('primary-text1'),
    },

    input: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        marginHorizontal: 4,
        borderRadius: 8,
    },
})
