import { ToastAndroid  } from "react-native"
import { mmkv, Global, API, hordeHeader} from '@globals'
import llamaTokenizer from '@constants/tokenizer'
import axios from "axios"

import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream'
polyfillReadableStream()

import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch'
polyfillFetch()

import { polyfill as polyfillTextEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillTextEncoding()

export const generateResponse = (setAbortFunction, insertGeneratedMessage, messages) => {
    
    console.log(`Obtaining response.`)
    
    const APIType = getString(Global.APIType)
    
    try {
        switch(APIType) {
            case API.KAI:
                KAIresponse(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.HORDE:
                hordeResponse(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.MANCER:
            case API.TGWUI:
                TGWUIReponseStream(setAbortFunction, insertGeneratedMessage, messages)
                break
        }
    } catch (error) {
        console.log(error)
        ToastAndroid.show(`Something went wrong.`, 3000)
        setValue(Global.NowGenerating, false)
    }
}

// MMKV

const getObject = (key) => {
    return JSON.parse(mmkv.getString(key) ?? "{}") 
}

const getString = (key) => {
    return mmkv.getString(key) ?? ""
}

const setValue = (key, value) => {
    mmkv.set(key ,value)
}

// Context

const buildContext = (max_length, messages) => {
    const currentInstruct = getObject(Global.CurrentInstruct)
    const userCard = getObject(Global.CurrentUserCard)
    const currentCard = getObject(Global.CurrentCharacterCard)
    const charName = getString(Global.CurrentCharacter)
    const userName = getString(Global.CurrentUser)

    let payload = 
    `${currentInstruct.input_sequence}
    \n${userCard?.data?.description ?? userCard?.description ?? ''}
    \n${currentInstruct.system_prompt}
    \n${currentCard?.description}\n`
    let message_acc = ``
    for(const message of messages.slice(1)) {
        let message_shard = `${message.name === charName ? currentInstruct.output_sequence : currentInstruct.input_sequence} ${message.mes}\n`
        if (llamaTokenizer.encode(payload + message_acc).length > max_length){
            //console.log(llamaTokenizer.encode(payload + message_acc).length > currentInstruct.max_length)
            break
        }
        message_acc += message_shard
    }
    if (messages.at(-1).name !== charName) {
        console.log(`Adding output sequence.`)
        payload += message_acc + currentInstruct.output_sequence
    }
    else {
        payload += message_acc.trim('\n')
    }
    payload = payload.replaceAll('{{char}}', charName).replaceAll('{{user}}',userName)
    console.log(`Payload size: ${llamaTokenizer.encode(payload).length}`)
    return payload
}

// Payloads

const constructKAIPayload = (messages) => {
    
    const presetKAI = getObject(Global.PresetKAI)
    const currentInstruct = getObject(Global.CurrentInstruct)
 
    return {
        "prompt": buildContext(presetKAI.max_context_length, messages),
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
        "min_p" : presetKAI.min_p,
        "grammar" : presetKAI.grammar,
    }
}

const constructHordePayload = (messages) => {
    const presetKAI = getObject(Global.PresetKAI)
    const currentInstruct = getObject(Global.CurrentInstruct)
    const hordeModels = getObject(Global.HordeModels)
    const hordeWorkers = getObject(Global.HordeWorkers)

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
        "prompt": buildContext(maxWorkerContext, messages),
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
        "dry_run" : false
      }
}

const constructTGWUIPayload = (messages) => {
    
    const presetTGWUI = getObject(Global.PresetTGWUI)
    const currentInstruct = getObject(Global.CurrentInstruct)
    const APIType = getString(Global.APIType)
    const mancerModel = getObject(Global.MancerModel)

    const context_len = (APIType === API.MANCER)? Math.min(presetTGWUI.max_length , mancerModel.limits.context) : presetTGWUI.max_length
    const gen_len = (APIType === API.MANCER)? Math.min(presetTGWUI.genamt , mancerModel.limits.completion) : presetTGWUI.genamt
    return {
        prompt: buildContext(context_len, messages),
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

// Fetch Response

const KAIresponse = (setAbortFunction, insertGeneratedMessage, messages) => {
    
    const kaiendpoint = getString(Global.KAIEndpoint)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let aborted = false

    console.log(`Using KAI`)
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
        body: JSON.stringify(constructKAIPayload(messages)),
        signal: controller.signal,
    }, {})
    .then((response) => {
        clearTimeout(timeout)
        const reader = response.body.getReader()
        return reader.read().then(function processText ({done, value}) {
            if(done || aborted) {
                setValue(Global.NowGenerating, false)
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
        setValue(Global.NowGenerating, false)
        if(!aborted)
            ToastAndroid.show('Connection Lost...', ToastAndroid.SHORT)
        console.log('KAI Response failed: ' + error)
    })
}

const hordeResponse = async (setAbortFunction, insertGeneratedMessage, messages) => {
    
    const hordeKey = getString(Global.HordeKey)
    const hordeModels = getObject(Global.HordeModels)

    let generation_id = ''
    let aborted = false
    
    if(hordeModels.length === 0) {
        ToastAndroid.show(`No Models Selected`, 2000)
        setValue(Global.NowGenerating, false)
        return
    }

    setAbortFunction(abortFunction => () => {
        aborted = true
        if (generation_id !== null)
        fetch(`https://stablehorde.net/api/v2/generate/text/status/${generation_id}`,{
            method: 'DELETE',
            headers:{
                ...hordeHeader(),							
                'accept':'application/json',
                'Content-Type':'application/json'
            },
        }).catch(error => {
            console.log(error)
        })
        setValue(Global.NowGenerating, false)
    })

    console.log(`Using Horde`)
    
    const payload = constructHordePayload(messages)

    const request = await fetch(`https://stablehorde.net/api/v2/generate/text/async`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {'apikey' : hordeKey, ...hordeHeader(), accept: 'application/json', 'content-type' :  'application/json'}
    })
    if(request.status === 401) {
        console.log('Invalid API key!')
        ToastAndroid.show(`Invalid API Key`, 2000)
        setValue(Global.NowGenerating, false)
        return
    }
    if(request.status !== 202) {
        // TODO: switch case per error type
        console.log(`Request failed.`)
        setValue(Global.NowGenerating, false)
        const body = await response.json()
        console.log(body.message)
        for (e of body.errors)
            console.log(e)
        return
    }
    
    const body = await request.json()
    generation_id = body.id
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
            setValue(Global.NowGenerating, false)
            console.log((await response.json())?.message)
            return
        }

        result = await response.json()
    } while (!result.done)

    if(aborted) return
    
    insertGeneratedMessage(result.generations[0].text, true)
    setValue(Global.NowGenerating, false)
}

const TGWUIReponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {
    
    let aborted = false
    let receivedmesssage = false
    const mancerModel = getObject(Global.MancerModel)
    const mancerKey = getString(Global.MancerKey)
    const APIType = getString(Global.APIType)
    const TGWUIStreamEndpoint = getString(Global.TGWUIStreamingEndpoint)

    setAbortFunction(abortFunction => () => {
        aborted = true
        setValue(Global.NowGenerating, false)
    })

    if(APIType === API.MANCER) {
        const check = await fetch(`https://neuro.mancer.tech/webui/${mancerModel?.id}/api/v1/model`, {
        method: 'GET',
        headers: {'X-API-KEY': mancerKey}
        })
        if(check.status !== 200) {
            setValue(Global.NowGenerating, false)
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
        setValue(Global.NowGenerating, false)
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
            constructTGWUIPayload(messages)
        )

        ws.send(JSON.stringify(payload))
    }
    
    ws.onmessage = (message) => {
        receivedmesssage = true
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
        setValue(Global.NowGenerating, false)
        if(!receivedmesssage){
            console.log(`Did not connect to websocket.`)
            ToastAndroid.show(`Did not receive anything from websocket. Check URL?`, 2000)
        }
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
