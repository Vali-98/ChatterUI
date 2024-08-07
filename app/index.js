import {
	View, Text, TextInput,
	SafeAreaView, TouchableOpacity,
	StyleSheet, ToastAndroid,
} from 'react-native'
import { useState, useEffect} from 'react'
import axios  from 'axios'
import {ChatWindow }from '@components/ChatMenu/ChatWindow/ChatWindow' 
import { useMMKVString,  useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, Color, API, hordeHeader, 
	getChatFile,getNewestChatFilename , MessageContext, saveChatFile, getCharacterCard} from '@globals'
import llamaTokenizer from '@constants/tokenizer'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu'

import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream'
polyfillReadableStream()

import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch'
polyfillFetch()

import { polyfill as polyfillTextEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillTextEncoding()

const Home = () => {

	const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
	const [userName, setUserName] = useMMKVString(Global.CurrentUser)
	const [kaiendpoint, setKAIEndpoint] = useMMKVString(Global.KAIEndpoint)
	const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
	const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)
	const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
	const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
	const [currentPreset, setCurrentPreset] = useMMKVObject(Global.CurrentPreset)
	const [APIType, setAPIType] = useMMKVString(Global.APIType)
	
    const [hordeKey, setHordeKey] = useMMKVString(Global.HordeKey)
    const [hordeModels, setHordeModels] = useMMKVObject(Global.HordeModels)
    const [hordeWorkers, setHordeWorkers] = useMMKVObject(Global.HordeWorkers)

	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState('');
	const [targetLength, setTargetLength] = useState(0)
	const [chatCache, setChatCache] = useState('')
	const [hordeID, setHordeID] = useState('')

	// load character chat upon character change
	useEffect(() => {
		if (charName === 'Welcome' || charName === undefined) return
		console.log(`Character changed to ${charName}`)
		getNewestChatFilename(charName).then(
			filename => setCurrentChat(filename)
		)
		getCharacterCard().then(data =>{
			setCurrentCard(JSON.parse(data))
		})
		
	}, [charName])
	
	const buildContext = (usedContext = currentPreset.max_context_length) => {
		let payload = `${currentInstruct.input_sequence}\n${userCard.description}\n${currentInstruct.system_prompt}\n${currentCard.description}\n`
		let message_acc = ``
		for(const message of messages.slice(1)) {
			let message_shard = `${message.name === charName ? currentInstruct.output_sequence : currentInstruct.input_sequence} ${message.mes}\n`
			if (llamaTokenizer.encode(payload + message_acc).length > usedContext){
				//console.log(llamaTokenizer.encode(payload + message_acc).length > currentInstruct.max_length)
				break
			}
			message_acc += message_shard
		}
		if (chatCache === '') {
			payload += message_acc + currentInstruct.output_sequence
		}
		else {
			payload += message_acc.trim('\n')
		}
		payload = payload.replaceAll('{{char}}', charName).replaceAll('{{user}}',userName)
		console.log(`Payload size: ${llamaTokenizer.encode(payload).length}`)
		return payload
	}

	const constructKAIPayload = () => {
		return {
			"prompt": buildContext(),
			"use_story": false,
			"use_memory": false,
			"use_authors_note": false,
			"use_world_info": false,
			"max_context_length": parseInt(currentPreset.max_length),
			"max_length": parseInt(currentPreset.genamt),
			"rep_pen": currentPreset.rep_pen,
			"rep_pen_range": parseInt(currentPreset.rep_pen_range),
			"rep_pen_slope": currentPreset.rep_pen_slope,
			"temperature": currentPreset.temp,
			"tfs": currentPreset.tfs,
			"top_a": currentPreset.top_a,
			"top_k": parseInt(currentPreset.top_k),
			"top_p": currentPreset.top_p,
			"typical": currentPreset.typical,
			"sampler_order": [6, 0, 1, 3, 4, 2, 5],
			"singleline": false,
			"sampler_seed": Math.floor(Math.random() * 1000000000),
			"sampler_full_determinism": false,
			"frmttriminc": true,
			"frmtrmblln": true,
			"stop_sequence": ["\n\n\n\n\n", currentInstruct.input_sequence],
			"mirostat": currentPreset.mirostat,
			"mirostat_tau": currentPreset.mirostat_tau,
			"mirostat_eta": currentPreset.mirostat_eta,
		}
	}

	const constructHordePayload = (dry = false) => {
		const usedModels = hordeModels.map(item => {return item.name})
		const usedWorkers = hordeWorkers.filter(item => item.models.some(model => usedModels.includes(model)))
		const usedContext = Math.min.apply(null, 
			usedWorkers.map(item => {return item.max_context_length})
			)
		const usedResponseLength = Math.min.apply(null,
			usedWorkers.map(item => {return item.max_length})
			) 
		console.log('Max worker context length: ' + usedContext)
		console.log('Max worker response length: ' + usedResponseLength)
		console.log('Models used: ' + usedModels)
		return {
			"prompt": buildContext(usedContext),
			"params": {
				"n": 1,
				"frmtadsnsp": false,
				"frmtrmblln": false,
				"frmtrmspch": false,
				"frmttriminc": true,
				"max_context_length": Math.min(parseInt(currentPreset.max_length), usedContext),
				"max_length": Math.min(parseInt(currentPreset.genamt), usedResponseLength ),
				"rep_pen": currentPreset.rep_pen,
				"rep_pen_range": parseInt(currentPreset.rep_pen_range),
				"rep_pen_slope": currentPreset.rep_pen_slope,
				"temperature": currentPreset.temp,
				"tfs": currentPreset.tfs,
				"top_a": currentPreset.top_a,
				"top_k": parseInt(currentPreset.top_k),
				"top_p": currentPreset.top_p,
				"typical": currentPreset.typical,
				"singleline": false,
				"use_default_badwordsids": true,
				"stop_sequence": ["\n\n\n\n\n", currentInstruct.input_sequence],
			},
			"trusted_workers": false,
			"slow_workers": true,
			"workers": [
			],
			"worker_blacklist": false,
			"models": usedModels,
			"dry_run" : dry
		  }
	}

	useEffect(() => {
		nowGenerating && generateResponse()
	}, [nowGenerating]) 

	// load character upon currentChat changing 
	useEffect(() => {	
		if(currentChat === '' || charName === 'Welcome' || charName === undefined) {
			return
		}
		console.log("Now reading " + currentChat + " for " + charName)
		getChatFile(charName, currentChat).then(newmessage => {
			setMessages(messages => newmessage)
		})		
	}, [currentChat])

	const handleSend = () => {
		if (newMessage.trim() !== ''){	
			const newMessageItem = createChatEntry(userName, true, newMessage)		
			setMessages(messages => [...messages, newMessageItem])
			setTargetLength(messages.length + 2)
		} else 
			setTargetLength(messages.length + 1)
		setChatCache('')
		setNowGenerating(true)
	}

	const insertGeneratedMessage = (data, save=false) => {
		setMessages(messages => {
			try {
				const createnew = (messages.length < targetLength)
				const mescontent = ((createnew )  ? chatCache + data : messages.at(-1).mes + data)
				.replaceAll(currentInstruct.input_sequence, ``)
				.replaceAll(currentInstruct.output_sequence, ``)
				const newmessage = (createnew) ? createChatEntry(charName, false, "", APIType, 
					(APIType === API.KAI) ? 'concedo/koboldcpp' : JSON.stringify(hordeModels)
				) : messages.at(-1)
				newmessage.mes = mescontent
				newmessage.swipes[newmessage.swipe_id] = mescontent
				newmessage.gen_finished = humanizedISO8601DateTime()
				newmessage.swipe_info[newmessage.swipe_id].gen_finished = humanizedISO8601DateTime()
			return createnew ?	[...messages , newmessage] : [...messages.slice(0,-1), newmessage]
			} catch (error) {
				console.log("Couldnt write due to:" + error)
				return messages 
			} finally {
				if(!save) return
				console.log(`Saving chat`)
				saveChatFile(messages, charName, currentChat)
			}
		})		
	}
	
	const generateResponse = () => {
		console.log(`Obtaining response.`)
		setNewMessage(n => '')
		switch(APIType) {
			case API.KAI:
				KAIresponse()
				break
			case API.HORDE:
				hordeResponse()
				break
		}
	}

	const KAIresponse = () => {
		console.log(`Using KAI`)
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);
		fetch(`${kaiendpoint}/api/extra/generate/stream`, {
			reactNative: {textStreaming: true},
			method: `POST`,
			body: JSON.stringify(constructKAIPayload()),
			signal: controller.signal,
		}, {})
		.then((response) => {
			clearTimeout(timeout)
			const reader = response.body.getReader()
			return reader.read().then(function processText ({done, value}) {
				if(done) {
					setNowGenerating(false)
					insertGeneratedMessage('', true)					
					console.log('Done')
					return
				}
				const text = new TextDecoder().decode(value)
				let events = text.split('\n')
				console.log(events)
				if(events.length !== 2) {	
					const data = 
					((events.length === 4)? 
						JSON.parse(events.at(1).substring(5)) : 
						JSON.parse(events.at(0).substring(5))
					).token
					insertGeneratedMessage(data)	
				}
				return reader.read().then(processText)
			})

		}).catch((error) => {
			setNowGenerating(false)
			ToastAndroid.show('Connection Lost...', ToastAndroid.SHORT)
			console.log('Something went wrong.' + error)
		})

	}

	const hordeResponse = async () => {
		if(hordeModels.length === 0) {
			ToastAndroid(`No Models Selected`, 2000)
			setNowGenerating(false)
			return
		}
		console.log(`Using Horde`)

		const request = await fetch(`https://stablehorde.net/api/v2/generate/text/async`, {
			method: 'POST',
			body: JSON.stringify(constructHordePayload()),
			headers: {'apikey' : hordeKey, ...hordeHeader(), 'accept' : 'application/json', 'Content-Type' : 'application/json'}
		})
		const body = await request.json()
		const generation_id = body.id
		setHordeID(generation_id)
		let result = undefined
		do {
			await new Promise(resolve => setTimeout(resolve, 5000))
			console.log(`Checking...`)
			const response = await fetch(`https://stablehorde.net/api/v2/generate/text/status/${generation_id}`, {
				method: 'GET',
				headers: {...hordeHeader()}
			})
			if(response.status !== 200) {
				console.log(`Response failed.`)
				setNowGenerating(false)
				return
			}
			result = await response.json()
		} while (!result.done)

		setNowGenerating(() => {
			insertGeneratedMessage(result.generations[0].text, true)
			return false
		})
	}



	return (
		<SafeAreaView style={styles.safeArea}>
			
			{ (charName === 'Welcome') ?
			<View>
				<Text style={styles.welcometext}> 
					Select A Character To Get Started!
				</Text>
			</View>
			
			:
			<MessageContext.Provider value={ [messages, setMessages, setTargetLength, setChatCache]}>
			<View style={styles.container}>
				
				<ChatWindow messages={messages} />
				<View style={styles.inputContainer}>
				<Menu >
					<MenuTrigger >
							<MaterialIcons 
								name='menu' 
								style={styles.optionsButton} 
								size={36} 
								color={Color.Button}
								/>
					</MenuTrigger>
					<MenuOptions customStyles={styles.optionMenu}>
						
						<MenuOption onSelect={() => {
							console.log(`Aborting Generation`)
							if(APIType === API.KAI)
								axios
									.create({timeout: 1000})
									.post(`${kaiendpoint}/api/extra/abort`)
									.then(() => {setNowGenerating(false)})	

							if(APIType === API.HORDE)
									setNowGenerating(false)
						}}>
						<View style={styles.optionItem}>
							<Ionicons name='stop' color={Color.Button} size={24}/>
							<Text style={styles.optionText} >Stop</Text>
						</View>
						</MenuOption>

						<MenuOption onSelect={() => {
							console.log(`Continuing Reponse`)
							setTargetLength(messages.length + (messages.at(-1).name === charName)? 0 : 1)
							if(messages.at(-1).name === charName) {
								setChatCache(messages.at(-1).mes)
								setTargetLength(messages.length)
							} else setTargetLength(messages.length + 1)

							setNowGenerating(true)
						}}>
						<View style={styles.optionItem}>
							<Ionicons name='arrow-forward' color={Color.Button} size={24}/>
							<Text style={styles.optionText} >Continue</Text>
						</View>
						</MenuOption>
						<MenuOption onSelect={() => {
							console.log('Regenerate Response')
							const len = messages.length
							if(messages.at(-1)?.name === charName){
								setMessages(messages.slice(0,-1))
								setTargetLength(len)
							} else setTargetLength(len+ 1)
							setChatCache('')
							setNowGenerating(true)
						}}>
						<View style={styles.optionItemLast}>
							<Ionicons name='reload' color={Color.Button} size={24}/>
							<Text style={styles.optionText} >Regenerate</Text>
						</View>
						</MenuOption>
						
					</MenuOptions>
				</Menu>

					<TextInput
						style={styles.input}
						placeholder="Message..."
						placeholderTextColor={Color.Offwhite}
						value={newMessage}
						onChangeText={(text) => setNewMessage(text)}
						multiline={true}
					/>
					

					{ nowGenerating ?
					<TouchableOpacity style={styles.sendButton} onPress={()=> {
						if(APIType === API.KAI)
								axios
									.create({timeout: 1000})
									.post(`${kaiendpoint}/api/extra/abort`)
									.then(() => {setNowGenerating(false)})	

						if(APIType === API.HORDE)
								fetch(`https://stablehorde.net/api/v2/generate/text/status/${hordeID}`,{
									method: 'DELETE',
									headers:{
										...hordeHeader(),							
										'accept':'application/json',
										'Content-Type':'application/json'
									},
								}).then((response) => {setNowGenerating(false)})	
					}}>
						<MaterialIcons name='stop' color={Color.Button} size={30}/>
					</TouchableOpacity>
						:
					
					<TouchableOpacity style={styles.sendButton} onPress={handleSend}>
						<MaterialIcons name='send' color={Color.Button} size={30}/>
					</TouchableOpacity>
					}
				</View>
			</View>
			</MessageContext.Provider>
			}
			
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex:1
	},
	safeArea: {
		flex: 1,
		backgroundColor: Color.Background
	},

	welcometext : {
		justifyContent: 'center',
		margin: 40,
		fontSize:20,
		color: Color.Text
	},

	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 8,
	},
	input: {
		color: Color.Text,
		backgroundColor: Color.DarkContainer,
		flex: 1,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 24,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},

	sendButton: {
		marginLeft: 8,
		padding: 8,
	},
	
	optionsButton: {
		marginRight: 4,
	},

	optionMenu : {
		optionsContainer: {
			backgroundColor: Color.DarkContainer,
			padding: 4,
			borderRadius: 8,
			borderColor: Color.Offwhite,
			borderWidth: 1,
		},
	},

	optionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingBottom: 8,
		borderBottomColor: Color.Offwhite,
		borderBottomWidth: 1,
	},
	optionItemLast: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	optionText : {
		color: Color.Text,
		marginLeft: 16,	
	},
});

export default Home;

const createChatEntry = (name, is_user, message, api, model) => {
	return {
		// important stuff
		"name":name,
		"is_user":is_user,
		"mes":message,
		
		// metadata
		"send_date": Date(),
		// gen_started
		// gen_finished
		"extra":{"api":"kobold","model":"concedo/koboldcpp"},
		"swipe_id":0,
		"swipes":[message],
		"swipe_info":[
			// metadata
			{	
				"send_date": Date(),
				"extra":{"api":api,"model":model},
			},
		],
	}
}
const  humanizedISO8601DateTime = (date) => {
    let baseDate = typeof date === 'number' ? new Date(date) : new Date();
    let humanYear = baseDate.getFullYear();
    let humanMonth = (baseDate.getMonth() + 1);
    let humanDate = baseDate.getDate();
    let humanHour = (baseDate.getHours() < 10 ? '0' : '') + baseDate.getHours();
    let humanMinute = (baseDate.getMinutes() < 10 ? '0' : '') + baseDate.getMinutes();
    let humanSecond = (baseDate.getSeconds() < 10 ? '0' : '') + baseDate.getSeconds();
    let humanMillisecond = (baseDate.getMilliseconds() < 10 ? '0' : '') + baseDate.getMilliseconds();
    let HumanizedDateTime = (humanYear + "-" + humanMonth + "-" + humanDate + " @" + humanHour + "h " + humanMinute + "m " + humanSecond + "s " + humanMillisecond + "ms");
    return HumanizedDateTime;
};


