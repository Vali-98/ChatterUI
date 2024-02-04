import CheckboxTitle from '@components/CheckboxTitle'
import SliderItem from '@components/SliderItem'
import { FontAwesome } from '@expo/vector-icons'
import { Color } from '@globals'
import { useState, useRef } from 'react'
import { Text, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import Collapsible from 'react-native-collapsible'

const Entry = ({ data, datakey, updateBook }) => {
    console.log(datakey)
    const previousdatakey = useRef(datakey)
    const [collapsed, setCollapsed] = useState(true)
    if (datakey !== previousdatakey.current) {
        previousdatakey.current = datakey
        setCollapsed(true)
    }

    return (
        <View style={{ ...styles.container, margin: 0, padding: 0 }}>
            <TouchableOpacity
                style={{
                    ...styles.container,
                    justifyContent: 'space-between',
                    flexDirection: 'row',
                    marginRight: 8,
                }}
                onPress={() => setCollapsed(!collapsed)}>
                <Text style={{ color: Color.Text }}>{data.key[0]}</Text>

                <FontAwesome
                    name={collapsed ? 'chevron-down' : 'chevron-up'}
                    size={20}
                    color={Color.Button}
                />
            </TouchableOpacity>

            <Collapsible style={{ ...styles.container, marginTop: 0 }} collapsed={collapsed}>
                <Text style={{ color: Color.Text }}>Key</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={{ color: Color.Text }}
                        value={data.key[0]}
                        onChangeText={(text) => {
                            updateBook(datakey, 'key', [text])
                        }}
                    />
                </View>
                <Text style={{ color: Color.Text }}>Secondary Key</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={{ color: Color.Text }}
                        value={data.keysecondary.join(', ')}
                        onChangeText={(text) => {
                            updateBook(
                                datakey,
                                'keysecondary',
                                text.split(',').map((item) => item.trim())
                            )
                        }}
                    />
                </View>
                <Text style={{ color: Color.Text }}>Content</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={{ color: Color.Text }}
                        value={data.content}
                        multiline
                        onChangeText={(text) => {
                            updateBook(datakey, 'content', text)
                        }}
                    />
                </View>
                <Text style={{ color: Color.Text }}>Comment</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={{ color: Color.Text }}
                        value={data.comment}
                        multiline
                        onChangeText={(text) => {
                            updateBook(datakey, 'comment', text)
                        }}
                    />
                </View>
                <CheckboxTitle
                    name="Constant"
                    body={data}
                    varname={'constant'}
                    onChange={(value) => {
                        updateBook(datakey, 'constant', value)
                    }}
                />
                <CheckboxTitle
                    name="Selective"
                    body={data}
                    varname={'selective'}
                    onChange={(value) => {
                        updateBook(datakey, 'selective', value)
                    }}
                />

                <CheckboxTitle
                    name="Disabled"
                    body={data}
                    varname={'disable'}
                    onChange={(value) => {
                        updateBook(datakey, 'disable', value)
                    }}
                />
                <SliderItem
                    name="Position"
                    body={data}
                    varname="position"
                    min={0}
                    max={100}
                    step={1}
                    precision={0}
                    onChange={(value) => updateBook(datakey, 'position', value)}
                />

                <SliderItem
                    name="Order"
                    body={data}
                    varname="order"
                    min={0}
                    max={100}
                    step={1}
                    precision={0}
                    onChange={(value) => updateBook(datakey, 'order', value)}
                />
            </Collapsible>
        </View>
    )
}

export default Entry

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: Color.Container,
        borderRadius: 16,
    },

    inputContainer: {
        marginTop: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
        paddingHorizontal: 8,
        maxHeight: 160,
    },
})
