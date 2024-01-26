import { FontAwesome } from '@expo/vector-icons';
import { Global, Color } from '@globals';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useMMKVObject, useMMKVString } from 'react-native-mmkv';
const Mancer = () => {
    const [mancerModel, setMancerModel] = useMMKVObject(Global.MancerModel);
    const [mancerKey, setMancerKey] = useMMKVString(Global.MancerKey);
    const [keyInput, setKeyInput] = useState('');

    const [modelList, setModelList] = useState([]);

    const getModels = async () => {
        const modelresults = await fetch(`https://mancer.tech/oai/v1/models`, {
            method: 'GET',
            headers: { accept: 'application/json' },
        }).catch(() => {
            ToastAndroid.show(`Could not get Mancer models.`, 2000);
            return [];
        });
        const list = (await modelresults.json()).data;
        setModelList(list);
    };

    useEffect(() => {
        getModels();
    }, []);

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>API Key</Text>
            <Text style={styles.subtitle}>Key will not be shown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={styles.input}
                    value={keyInput}
                    onChangeText={(value) => {
                        setKeyInput(value);
                    }}
                    placeholder="Press save to confirm key"
                    placeholderTextColor={Color.Offwhite}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        if (keyInput === '') {
                            ToastAndroid.show('No key entered!', 2000);
                            return;
                        }
                        setMancerKey(keyInput);
                        setKeyInput('');
                        ToastAndroid.show('Key saved!', 2000);
                    }}>
                    <FontAwesome name="save" color={Color.Button} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
                <Text style={{ color: Color.Text, fontSize: 16 }}>Model</Text>
                <Dropdown
                    value={mancerModel}
                    data={modelList}
                    labelField="name"
                    valueField="id"
                    onChange={(item) => {
                        if (item.name === mancerModel?.name) return;
                        setMancerModel(item);
                    }}
                    style={styles.dropdownbox}
                    selectedTextStyle={styles.selected}
                    containerStyle={styles.dropdownbox}
                    itemTextStyle={{ color: Color.Text }}
                    itemContainerStyle={{
                        backgroundColor: Color.DarkContainer,
                        borderRadius: 8,
                    }}
                    activeColor={Color.Container}
                />
            </View>

            {mancerModel !== undefined && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{mancerModel.name}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Color.Offwhite }}>Context Size</Text>
                            <Text style={{ color: Color.Offwhite }}>Generation Limit</Text>
                            <Text style={{ color: Color.Offwhite }}>Completion Cost</Text>
                            <Text style={{ color: Color.Offwhite }}>Prompt Cost</Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Color.Offwhite }}>
                                : {mancerModel.limits.context}
                            </Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {mancerModel.limits.completion}
                            </Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {mancerModel.pricing.completion}
                            </Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {mancerModel.pricing.prompt}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

export default Mancer;

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Color.Text,
        fontSize: 20,
    },

    subtitle: {
        color: Color.Offwhite,
    },

    input: {
        flex: 1,
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    button: {
        padding: 5,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
        marginLeft: 8,
    },

    dropdownContainer: {
        marginTop: 16,
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

    modelInfo: {
        borderRadius: 8,
        backgroundColor: Color.Container,
        flex: 1,
        padding: 16,
        marginTop: 12,
    },
});
