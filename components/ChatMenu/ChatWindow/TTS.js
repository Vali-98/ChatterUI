import { FontAwesome } from '@expo/vector-icons';
import { Global, Color } from '@globals';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { View, TouchableOpacity, ToastAndroid } from 'react-native';
import { useMMKVObject } from 'react-native-mmkv';

const TTS = ({ message }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentSpeaker, setCurrentSpeaker] = useMMKVObject(Global.TTSSpeaker);

    return (
        <View style={{ marginTop: 8 }}>
            {isSpeaking ? (
                <TouchableOpacity
                    onPress={() => {
                        setIsSpeaking(false);
                        Speech.stop();
                    }}>
                    <FontAwesome name="stop" size={20} color={Color.Button} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={async () => {
                        if (currentSpeaker === undefined) {
                            ToastAndroid.show('No Speaker Chosen', 2000);
                            return;
                        }
                        setIsSpeaking(true);
                        if (await Speech.isSpeakingAsync()) Speech.stop();
                        Speech.speak(message, {
                            language: currentSpeaker.language,
                            voice: currentSpeaker.identifier,
                            onDone: () => setIsSpeaking(false),
                            onStopped: () => setIsSpeaking(false),
                        });
                    }}>
                    <FontAwesome name="volume-down" size={28} color={Color.Button} />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default TTS;
