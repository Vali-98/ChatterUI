import { View, TouchableOpacity } from 'react-native'
import * as Speech from 'expo-speech'
import {  } from 'react-native-gesture-handler'
import { useState } from 'react'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Color } from '@globals'
import { useMMKVObject } from 'react-native-mmkv'

const TTS = ({message}) => {

	const [isSpeaking, setIsSpeaking] = useState(false)
	const [currentSpeaker, setCurrentSpeaker] = useMMKVObject(Global.TTSSpeaker)

	return (
		<View style={{marginTop: 8}}>
			{isSpeaking ? 
			<TouchableOpacity onPress={() => {
				setIsSpeaking(false)
				Speech.stop()
			}}>
				<FontAwesome name='stop' size={20} color={Color.Button}/>	
			</TouchableOpacity> 
			:
			<TouchableOpacity onPress={async () => {
				if(currentSpeaker == undefined) {
					ToastAndroid.show('No Speaker Chosen', 2000)
					return
				}
				setIsSpeaking(true)
				if (await Speech.isSpeakingAsync())
					Speech.stop()
				Speech.speak(message, 
					{
						language: currentSpeaker.language,
						voice: currentSpeaker.identifier,
						onDone: () => setIsSpeaking(false),
						onStopped: () => setIsSpeaking(false),
					}
				)
			}}>
				<FontAwesome name='volume-down' size={28} color={Color.Button}/>	
			</TouchableOpacity>}
		</View>
	)
}

export default TTS