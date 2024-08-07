import {
	View, Text, TextInput,
	SafeAreaView, TouchableOpacity,
	StyleSheet, ToastAndroid,
} from 'react-native'
import { useState, useEffect, useContext} from 'react'
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
	// User
	const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
	const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
	// Character
	const [userName, setUserName] = useMMKVString(Global.CurrentUser)
	const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)
	const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
	// Process
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
	// Instruct
	const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
	// Presets
	const [presetKAI, setPresetKAI] = useMMKVObject(Global.PresetKAI)
    const [presetTGWUI, setPresetTGWUI] = useMMKVObject(Global.PresetTGWUI)
    const [presetNovelAI, setPresetNovelAI] = useMMKVObject(Global.PresetNovelAI)
	// API
	const [APIType, setAPIType] = useMMKVString(Global.APIType)
	//	KAI
	const [kaiendpoint, setKAIEndpoint] = useMMKVString(Global.KAIEndpoint)
	// HORDE
    const [hordeKey, setHordeKey] = useMMKVString(Global.HordeKey)
    const [hordeModels, setHordeModels] = useMMKVObject(Global.HordeModels)
    const [hordeWorkers, setHordeWorkers] = useMMKVObject(Global.HordeWorkers)
	// TGWUI
	const [TGWUIBlockEndpoint, setBlockEndpoint] = useMMKVString(Global.TGWUIBlockingEndpoint)
    const [TGWUIStreamEndpoint, setStreamEndpoint] = useMMKVString(Global.TGWUIStreamingEndpoint)
	// Mancer
	const [mancerKey, setMancerKey] = useMMKVString(Global.MancerKey)
	const [mancerModel, setMancerModel] = useMMKVObject(Global.MancerModel)
	// Local
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState('');
	const [targetLength, setTargetLength] = useState(0)
	const [chatCache, setChatCache] = useState('')
	const [hordeID, setHordeID] = useState('')
	const [abortFunction, setAbortFunction] = useState(undefined)

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
	
	// triggers generation when set true
	// TODO : Use this to save instead 
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


	const buildContext = (usedContext) => {
		let payload = `${currentInstruct.input_sequence}\n${userCard?.description ?? ''}\n${currentInstruct.system_prompt}\n${currentCard.description}\n`
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

	const clampObject = (item , keys) => {
		const clamp = (value, min, max) => {return Math.max(min, Math.min(max, value))}
		for( k of keys )
			item[k.name] = clamp(item[k.name], k.min, k.max)
		return item
	}

	const constructKAIPayload = () => {
		return {
			"prompt": buildContext(presetKAI.max_context_length),
			"use_story": false,
			"use_memory": false,
			"use_authors_note": false,
			"use_world_info": false,
			"max_context_length": parseInt(presetKAI.max_length),
			"max_length": parseInt(presetKAI.genamt),
			"rep_pen": presetKAI.rep_pen,
			"rep_pen_range": parseInt(presetKAI.rep_pen_range),
			"rep_pen_slope": presetKAI.rep_pen_slope,
			"temperature": presetKAI.temp,
			"tfs": presetKAI.tfs,
			"top_a": presetKAI.top_a,
			"top_k": parseInt(presetKAI.top_k),
			"top_p": presetKAI.top_p,
			"typical": presetKAI.typical,
			"sampler_order": [6, 0, 1, 3, 4, 2, 5],
			"singleline": false,
			"sampler_seed": Math.floor(Math.random() * 1000000000),
			"sampler_full_determinism": false,
			"frmttriminc": true,
			"frmtrmblln": true,
			"stop_sequence": ["\n\n\n\n\n", currentInstruct.input_sequence],
			"mirostat": presetKAI.mirostat,
			"mirostat_tau": presetKAI.mirostat_tau,
			"mirostat_eta": presetKAI.mirostat_eta,
		}
	}

	const constructHordePayload = (dry = false,) => {
		const usedModels = hordeModels.map(item => {return item.name})
		const usedWorkers = hordeWorkers.filter(item => item.models.some(model => usedModels.includes(model)))
		const maxWorkerContext = Math.min.apply(null, 
			usedWorkers.map(item => {return item.max_context_length})
			)
		const usedResponseLength = Math.min.apply(null,
			usedWorkers.map(item => {return item?.max_length})
			) 
		
		console.log('Max worker context length: ' + maxWorkerContext)
		console.log('Max worker response length: ' + usedResponseLength)
		console.log('Models used: ' + usedModels)
		return {
			"prompt": buildContext(maxWorkerContext),
			"params": {
				"n": 1,
				"frmtadsnsp": false,
				"frmtrmblln": false,
				"frmtrmspch": false,
				"frmttriminc": true,
				"max_context_length": Math.min(parseInt(presetKAI.max_length), maxWorkerContext),
				"max_length": Math.min(parseInt(presetKAI.genamt), usedResponseLength ),
				"rep_pen": presetKAI.rep_pen,
				"rep_pen_range": Math.min(parseInt(presetKAI.rep_pen_range), maxWorkerContext, 4096),
				"rep_pen_slope": presetKAI.rep_pen_slope,
				"temperature": presetKAI.temp, 
				"tfs": presetKAI.tfs,
				"top_a": presetKAI.top_a,
				"top_k": parseInt(presetKAI.top_k),
				"top_p": presetKAI.top_p,
				"typical": presetKAI.typical,
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

	const constructTGWUIPayload = () => {
		const context_len = (APIType === API.MANCER)? Math.min(presetTGWUI.max_length , mancerModel.limits.context) : presetTGWUI.max_length
		const gen_len = (APIType === API.MANCER)? Math.min(presetTGWUI.genamt , mancerModel.limits.completion) : presetTGWUI.genamt
		return {
			prompt: buildContext(context_len),
			max_new_tokens: parseInt(gen_len),
			do_sample: presetTGWUI.do_sample,
			temperature: parseFloat(presetTGWUI.temp),
			top_p: parseFloat(presetTGWUI.top_p),
			top_a: parseFloat(presetTGWUI.top_a),
			top_k: parseFloat(presetTGWUI.top_k),
			typical_p: parseFloat(presetTGWUI.typical_p),
			epsilon_cutoff: parseFloat(presetTGWUI.epsilon_cutoff),
            eta_cutoff : parseFloat(presetTGWUI.eta_cutoff),
            tfs : parseFloat(presetTGWUI.tfs),
            repetition_penalty: parseFloat(presetTGWUI.rep_pen),
            repetition_penalty_range: parseInt(presetTGWUI.rep_pen_range),
            min_length: parseInt(presetTGWUI.min_length),
            no_repeat_ngram_size: parseInt(presetTGWUI.no_repeat_ngram_size),
            num_beams: parseInt(presetTGWUI.num_beams),
			penalty_alpha: parseFloat(presetTGWUI.penalty_alpha),
            length_penalty: parseFloat(presetTGWUI.length_penalty),
            early_stopping: presetTGWUI.early_stopping,
			mirostat_mode: parseInt(presetTGWUI.mirostat_mode),
			mirostat_eta: parseFloat(presetTGWUI.mirostat_eta),
			mirostat_tau: parseFloat(presetTGWUI.mirostat_tau),
			add_bos_token: presetTGWUI.add_bos_token,
			truncation_length: parseInt(presetTGWUI.truncation_length),
			ban_eos_token: presetTGWUI.ban_eos_token,
			skip_special_tokens: presetTGWUI.skip_special_tokens,
			stopping_strings: ["\n\n\n\n\n", currentInstruct.input_sequence],
            seed:  parseInt((presetTGWUI?.seed === undefined || presetTGWUI.seed === -1)? parseInt(Math.random() * 12000000) : -1 ),
		}
	}

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
				const newmessage = (createnew) ? createChatEntry(charName, false, "", APIType, 'concedo/koboldcpp'
				) : messages.at(-1)
				newmessage.mes = mescontent
				newmessage.swipes[newmessage.swipe_id] = mescontent
				newmessage.gen_finished = humanizedISO8601DateTime()
				newmessage.swipe_info[newmessage.swipe_id].gen_finished = humanizedISO8601DateTime()
				const finalized_messages = createnew ?	[...messages , newmessage] : [...messages.slice(0,-1), newmessage]
				return finalized_messages
			} catch (error) {
				console.log("Couldnt write due to:" + error)
				return messages 
			} finally {
				if(save) {
					console.log(`Saving chat`)
					saveChatFile(messages, charName, currentChat)
				} 
			}
		})		
	}
	
	const generateResponse = () => {
		console.log(`Obtaining response.`)
		setNewMessage(n => '')
		try {
			switch(APIType) {
				case API.KAI:
					KAIresponse()
					break
				case API.HORDE:
					hordeResponse()
					break
				case API.MANCER:
				case API.TGWUI:
					TGWUIReponseStream()
					break
			}
		} catch (error) {
			console.log(error)
			ToastAndroid.show(`Something went wrong.`, 3000)
		}
	}

	const KAIresponse = () => {
		console.log(`Using KAI`)
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 60000);
		aborted = false
		setAbortFunction(abortFunction => () => {
			controller.abort()
			aborted = true
			axios
				.create({timeout: 1000})
				.post(`${kaiendpoint}/api/extra/abort`)
				.catch(() => {ToastAndroid.show(`Abort Failed`, 2000)})
		})

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
				if(done || aborted) {
					setNowGenerating(false)
					insertGeneratedMessage('', true)					
					console.log('Done')
					return
				}
				const text = new TextDecoder().decode(value)
				let events = text.split('\n')
				for(e of events)
				if(e.startsWith('data')) {	
					const data = JSON.parse(e.substring(5)).token
					insertGeneratedMessage(data)	
				}
				return reader.read().then(processText)
			})

		}).catch((error) => {
			setNowGenerating(false)
			if(!aborted)
				ToastAndroid.show('Connection Lost...', ToastAndroid.SHORT)
			console.log('KAI Response failed: ' + error)
		})
	}

	const hordeResponse = async () => {

		let aborted = false

		if(hordeModels.length === 0) {
			ToastAndroid.show(`No Models Selected`, 2000)
			setNowGenerating(false)
			return
		}

		setAbortFunction(abortFunction => () => {
			aborted = true
			fetch(`https://stablehorde.net/api/v2/generate/text/status/${hordeID}`,{
				method: 'DELETE',
				headers:{
					...hordeHeader(),							
					'accept':'application/json',
					'Content-Type':'application/json'
				},
			})	
			setNowGenerating(false)
		})

		console.log(`Using Horde`)
		const payload = constructHordePayload()
		const request = await fetch(`https://stablehorde.net/api/v2/generate/text/async`, {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {'apikey' : hordeKey, ...hordeHeader(), accept: 'application/json', 'content-type' :  'application/json'}
		})
		if(request.status === 401) {
			console.log('Invalid API key!')
			ToastAndroid.show(`Invalid API Key`, 2000)
			setNowGenerating(false)
			return
		}
		if(request.status !== 202) {
			// TODO: switch case per error type
			console.log(`Request failed.`)
			setNowGenerating(false)
			const body = await response.json()
			console.log(body.message)
			for (e of body.errors)
				console.log(e)
			return
		}
		
		const body = await request.json()
		const generation_id = body.id
		let result = undefined
		do {			
			await new Promise(resolve => setTimeout(resolve, 5000))
			if(aborted) return
			
			console.log(`Checking...`)
			const response = await fetch(`https://stablehorde.net/api/v2/generate/text/status/${generation_id}`, {
				method: 'GET',
				headers: {...hordeHeader(), accept: 'application/json', 'content-type' :  'application/json'}
			})
			if(response.status === 400) {
				console.log(`Response failed.`)
				setNowGenerating(false)
				console.log((await response.json())?.message)
				return
			}
			result = await response.json()
		} while (!result.done)

		if(aborted) return
		
		setNowGenerating(() => {
			insertGeneratedMessage(result.generations[0].text, true)
			return false
		})
	}

	const TGWUIReponseStream = async () => {
		
		let aborted = false
		setAbortFunction(abortFunction => () => {
			aborted = true
			setNowGenerating(false)
		})

		if(APIType === API.MANCER) {
			const check = await fetch(`https://neuro.mancer.tech/webui/${mancerModel?.id}/api/v1/model`, {
			method: 'GET',
			headers: {'X-API-KEY': mancerKey}
			})
			if(check.status !== 200) {
				setNowGenerating(false)
				ToastAndroid.show(`Invalid Model or API key!`, 3000)
				return
			}
		}

		if(aborted) return

		try {
		const ws = new WebSocket(
			(APIType === API.MANCER)?
			`wss://neuro.mancer.tech/webui/${mancerModel.id}/api/v1/stream`
			:
			`${TGWUIStreamEndpoint}`
			)
		
		setAbortFunction(abortFunction => () => {
			ws.close()
			aborted = true
			setNowGenerating(false)
		})

		ws.onopen = () => {

			console.log(`Connected!`)

			if(aborted) {
				ws.close()
				return
			}

			let headers = {}
			if(APIType === API.MANCER)
				{headers = {'X-API-KEY': mancerKey}}

			const payload = Object.assign(
				{},
				headers,
				constructTGWUIPayload()
			)

			ws.send(JSON.stringify(payload))
		}
		
		ws.onmessage = (message) => {
			if(aborted) {
				ws.close()
				return
			}

			const data = JSON.parse(message.data)
			if(data.event === 'text_stream')
				insertGeneratedMessage(data.text)
			if(data.event === 'stream_end'){
				ws.close()
				if(!aborted)
					insertGeneratedMessage(``, true)
				console.log(data?.error ?? 'Stream closed.')
				if(data?.error !== undefined)
					ToastAndroid.show(data.error.replace(`<br/>`, `\n`), 2000)
			}
		}

		ws.onclose = (message) => {
			console.log("WebSocket closed: " + message.reason)
			setNowGenerating(false)
		}

		ws.onerror = (error) => {
			console.log(`ERROR: ` + error?.message)
			if(error?.messsage !== undefined)
				ToastAndroid.show(error?.message, 2000)
		}
		} catch (error) {
			console.log(`ERROR: ` + error)
		}
	}

	const abortResponse = () => {
		console.log(`Aborting Generation`)
		abortFunction()
	}

	const regenerateResponse = () => {
		console.log('Regenerate Response')
		const len = messages.length
		if(messages.at(-1)?.name === charName){
			setMessages(messages.slice(0,-1))
			setTargetLength(len)
		} else setTargetLength(len+ 1)
		setChatCache('')
		setNowGenerating(true)
	}

	const continueResponse = () => {
		console.log(`Continuing Reponse`)
		setTargetLength(messages.length + (messages.at(-1).name === charName)? 0 : 1)
		if(messages.at(-1).name === charName) {
			setChatCache(messages.at(-1).mes)
			setTargetLength(messages.length)
		} else setTargetLength(messages.length + 1)
		setNowGenerating(true)
	}

	const menuoptions = [
		{callback: abortResponse, text: "Stop", button: "stop"},
		{callback: continueResponse, text: "Continue", button: "arrow-forward"},
		{callback: regenerateResponse, text: "Regenerate", button: "reload"},
	]

	return (
		<SafeAreaView style={styles.safeArea}>
			
			{ (charName === 'Welcome') ?
			<View><Text style={styles.welcometext}> 
				Select A Character To Get Started!
			</Text></View>		
			:
			<MessageContext.Provider value={ [messages, setMessages, setTargetLength, setChatCache]}>
			<View style={styles.container}>			
				
				<ChatWindow messages={messages} />

				<View style={styles.inputContainer}>
				
				<Menu>
				<MenuTrigger >
					<MaterialIcons name='menu' style={styles.optionsButton} size={36} color={Color.Button} />
				</MenuTrigger>
					<MenuOptions customStyles={styles.optionMenu}>
						{menuoptions.map((item, index) => (
							<MenuOption key={index} onSelect={item.callback}>
							<View style={(index === menuoptions.length - 1)? styles.optionItemLast : styles.optionItem}>
								<Ionicons name={item.button} color={Color.Button} size={24}/>
								<Text style={styles.optionText} >{item.text}</Text>
							</View>
							</MenuOption>
						))}						
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
					<TouchableOpacity style={styles.sendButton} onPress={abortResponse}>
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
		flex:1,
	},
	safeArea: {
		flex: 1,
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


