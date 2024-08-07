import { Global, Color } from '@globals';
import { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';

const KAI = () => {
    const [kaiendpoint, setKAIEndpoint] = useMMKVString(Global.KAIEndpoint);

    useEffect(() => {
        if (kaiendpoint === undefined || kaiendpoint === ``)
            setKAIEndpoint(`http://127.0.0.1:5000`);
    }, []);

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>URL</Text>
            <TextInput
                style={styles.input}
                value={kaiendpoint}
                onChangeText={(value) => {
                    setKAIEndpoint(value);
                }}
                placeholder="eg. http://127.0.0.1:5000"
                placeholderTextColor={Color.Offwhite}
            />
        </View>
    );
};

export default KAI;

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Color.Text,
    },

    input: {
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },
});
