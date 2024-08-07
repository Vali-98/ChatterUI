import { ToastAndroid  } from "react-native"
import { mmkv, Global, API, hordeHeader, Llama} from '@globals'
import { replaceMacros } from "@constants/Utils"
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
                MancerResponseStream(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.TGWUI:
                TGWUIReponseStream(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.COMPLETIONS:
                CompletionsResponseStream(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.LOCAL:
                localStreamResponse(setAbortFunction, insertGeneratedMessage, messages)
                break
            case API.OPENROUTER:
                openRouterResponseStream(setAbortFunction, insertGeneratedMessage, messages)
                break
            default:
                setValue(Global.NowGenerating, false)
            
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

const stopGenerating = () => {
    setValue(Global.NowGenerating, false)
}

// Context

const buildContext = (max_length, messages) => {
    const currentInstruct = getObject(Global.CurrentInstruct)
    const userCard = getObject(Global.CurrentUserCard)
    const currentCard = getObject(Global.CurrentCharacterCard)
    const charName = getString(Global.CurrentCharacter)

    let payload = 
    `${currentInstruct.system_sequence_prefix}
    \n${userCard?.data?.description ?? userCard?.description ?? ''}
    \n${currentInstruct.system_prompt}
    \n${currentCard?.description ?? currentCard?.data.description}\n`
    if(currentInstruct.system_sequence_suffix != '')
        payload += currentInstruct.system_sequence_suffix

    let message_acc = ``
    for(const message of messages.slice(1).reverse()) {
        let message_shard = `${message.name === charName ? currentInstruct.output_sequence : currentInstruct.input_sequence} ${message.mes}\n`
        if (llamaTokenizer.encode(payload + message_shard + message_acc).length > max_length){
            //console.log(llamaTokenizer.encode(payload + message_acc).length > currentInstruct.max_length)
            break
        }
        message_acc = message_shard + message_acc
    }
    if (messages.at(-1).name !== charName) {
        console.log(`Adding output sequence.`)
        payload += message_acc + currentInstruct.output_sequence
    }
    else {
        payload += message_acc.trim('\n')
    }
    payload = replaceMacros(payload)
    console.log(`Payload size: ${llamaTokenizer.encode(payload).length}`)
    return payload
}

const buildChatCompletionContext = (max_length, messages) => {
    
    const userCard = getObject(Global.CurrentUserCard)
    const currentCard = getObject(Global.CurrentCharacterCard)
    const charName = getString(Global.CurrentCharacter)
    const currentInstruct = instructReplaceMacro()

    let initial  = 
    `${currentInstruct.system_sequence_prefix}
    \n${userCard?.data?.description ?? userCard?.description ?? ''}
    \n${currentCard?.description ?? currentCard?.data.description}\n`
    let total_length = llamaTokenizer.encode(initial).length

    let payload = [{role: 'system', content: initial}]

    for(const message of messages.slice(1).reverse()) {
        const len = llamaTokenizer.encode(message.mes).length + total_length
        if (len > max_length) break
        payload.push({role: message.name ==charName ? 'assistant' : 'user', content: message.mes})
        total_length += len
    }
    return payload
}

const instructReplaceMacro = () => {
    let instruct = getObject(Global.CurrentInstruct)
    for(const key in Object.keys(instruct)){
        instruct[key] = replaceMacros(instruct[key])
    }
    return instruct
}


// Payloads

const constructKAIPayload = (messages) => {
    
    const preset = getObject(Global.PresetData)
    const currentInstruct = instructReplaceMacro()
    
    return {
        "prompt": buildContext(preset.max_length, messages),
        "max_context_length": parseInt(preset.max_length),
        "max_length": parseInt(preset.genamt),
        "rep_pen": parseFloat(preset.rep_pen),
        "rep_pen_range": parseInt(preset.rep_pen_range),
        "temperature": parseFloat(preset.temp),
        "tfs": parseFloat(preset.tfs),
        "top_a": parseFloat(preset.top_a),
        "top_k": parseInt(preset.top_k),
        "top_p": parseFloat(preset.top_p),
        "typical": parseFloat(preset.typical),
        "sampler_order": [6, 0, 1, 3, 4, 2, 5],
        "sampler_seed": parseInt(preset.seed)  == -1 ? Math.floor(Math.random() * 999999) : parseInt(preset.seed),
        "stop_sequence": ["\n\n\n\n\n", currentInstruct.input_sequence],
        "mirostat": parseInt(preset.mirostat_mode),
        "mirostat_tau": parseFloat(preset.mirostat_tau),
        "mirostat_eta": parseFloat(preset.mirostat_eta),
        "min_p" : parseFloat(preset.min_p),
        "grammar" : preset.grammar ?? "",
        "use_default_badwordids" : !preset.ban_eos_token,
    }
}

const constructHordePayload = (messages) => {
    const preset = getObject(Global.PresetData)
    const currentInstruct = instructReplaceMacro()
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
            "max_context_length": Math.min(parseInt(preset.max_length), maxWorkerContext),
            "max_length": Math.min(parseInt(preset.genamt), usedResponseLength ),
            "rep_pen": preset.rep_pen,
            "rep_pen_range": Math.min(parseInt(preset.rep_pen_range), maxWorkerContext, 4096),
            "rep_pen_slope": preset.rep_pen_slope,
            "temperature": preset.temp, 
            "tfs": preset.tfs,
            "top_a": preset.top_a,
            "top_k": parseInt(preset.top_k),
            "top_p": preset.top_p,
            "typical": preset.typical,
            "singleline": false,
            "use_default_badwordsids": preset.ban_eos_token,
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
    
const preset = getObject(Global.PresetData)
const currentInstruct = instructReplaceMacro()
   return {
        stream : true,
        min_p : preset.min_p,
        prompt: buildContext(preset.max_length, messages),
        max_tokens: parseInt(preset.genamt),
        do_sample: preset.do_sample,
        temperature: parseFloat(preset.temp),
        top_p: parseFloat(preset.top_p),
        top_a: parseFloat(preset.top_a),
        top_k: parseFloat(preset.top_k),
        typical_p: parseFloat(preset.typical),
        epsilon_cutoff: parseFloat(preset.epsilon_cutoff),
        eta_cutoff : parseFloat(preset.eta_cutoff),
        tfs : parseFloat(preset.tfs),
        repetition_penalty: parseFloat(preset.rep_pen),
        repetition_penalty_range: parseInt(preset.rep_pen_range),
        min_length: parseInt(preset.min_length),
        no_repeat_ngram_size: parseInt(preset.no_repeat_ngram_size),
        num_beams: parseInt(preset.num_beams),
        penalty_alpha: parseFloat(preset.penalty_alpha),
        length_penalty: parseFloat(preset.length_penalty),
        early_stopping: preset.early_stopping,
        mirostat_mode: parseInt(preset.mirostat_mode),
        mirostat_eta: parseFloat(preset.mirostat_eta),
        mirostat_tau: parseFloat(preset.mirostat_tau),
        add_bos_token: preset.add_bos_token,
        truncation_length: parseInt(preset.truncation_length),
        ban_eos_token: preset.ban_eos_token,
        skip_special_tokens: preset.skip_special_tokens,
        stopping_strings: ["\n\n\n\n\n", currentInstruct.input_sequence],
        seed:  parseInt((preset?.seed === undefined || preset.seed === -1)? parseInt(Math.random() * 12000000) : -1 ),
        guidance_scale: preset.guidance_scale,
        negative_prompt: preset.negative_prompt,
    }
}

const constructMancerPayload = (messages) => {
    
    const preset = getObject(Global.PresetData)
    const currentInstruct = instructReplaceMacro()
    const mancerModel = getObject(Global.MancerModel)

    const context_len = Math.min(preset.max_length , mancerModel.limits.context)
    const gen_len =  Math.min(preset.genamt , mancerModel.limits.completion) 
    
    return {
        "prompt": buildContext(context_len, messages),
        "model": mancerModel.id,
        "stream": true,
        "max_tokens": context_len,
        "min_tokens": gen_len,
        "stop": ["\n\n\n\n\n", currentInstruct.input_sequence],
        //"logit_bias": {},
        "temperature": preset.temp,
        "repetition_penalty": preset.rep_pen,
        "presence_penalty": preset.presence_pen,
        "frequency_penalty": preset.freq_pen,
        "top_k": preset.top_k,
        "top_p": preset.top_p,
        "top_a": preset.top_a,
        "min_p": preset.min_p,
      }
}

const constructCompletionsPayload = (messages) => {
    const preset = getObject(Global.PresetData)
    const currentInstruct = instructReplaceMacro()
    return {
        "stream" : true,
        "max_context_length": preset.max_length,
        "max_tokens": preset.genamt,
        "prompt": buildContext(preset.max_length, messages),
        "rep_pen": preset.rep_pen,
        "rep_pen_range": preset.rep_pen_range,
        "rep_pen_slope": preset.rep_pen_slope,
        "temperature": preset.temp,
        "tfs": preset.tfs,
        "top_a": preset.top_a,
        "top_k": preset.top_k,
        "top_p": preset.top_p,
        "typical": preset.typical,
        "ignore_eos" : preset.ban_eos_token,
        "mirostat_mode" : preset.mirostat_mode,
        "mirostat_tau" : preset.mirostat_tau,
        "mirostat_eta" : preset.mirostat_eta,
        "grammar" : preset.grammar,
        //"trim_stop" : true,
        "seed" : parseInt((preset?.seed === undefined || preset.seed === -1)? parseInt(Math.random() * 12000000) : -1 ),
        "sampler_order" : [6, 0, 1, 3, 4, 2, 5],
        "stop": ["\n\n\n\n\n", currentInstruct.input_sequence],
        "frequency_penalty" : preset.freq_pen,
        "presence_penalty" : preset.presence_pen
      }

}

const constructLocalPayload = (messages) => {
    const preset = getObject(Global.PresetData)
    const currentInstruct = instructReplaceMacro()
    const localPreset = getObject(Global.LocalPreset)
    return {
        prompt: buildContext(localPreset.context_length, messages),
        grammar: preset.grammar,
        stop: [currentInstruct.input_sequence, currentInstruct.output_sequence, "\n\n\n\n\n",],
      
        n_predict: preset.genamt,
        n_threads: localPreset.threads,
      
        temperature: preset.temp,
        repeat_penalty: preset.rep_pen,
        presence_penalty: preset.presence_pen,
        frequency_penalty: preset.freq_pen,
        mirostat: preset.mirostat_mode,
        mirostat_tau: preset.mirostat_tau,
        mirostat_eta: preset.mirostat_eta,
        top_k: preset.top_k,
        top_p: preset.top_p,
        tfs_z: preset.tfs,
        typical_p: preset.typical,
    }
}

const constructOpenRouterPayload = (messages) => {
    
    const openRouterModel = getObject(Global.OpenRouterModel)
    const currentInstruct = instructReplaceMacro()
    const preset = getObject(Global.PresetData)

    return {
        messages: buildChatCompletionContext(openRouterModel.context_length, messages),
        model: openRouterModel.id,
        frequency_penalty: preset.freq_pen,
        max_tokens: preset.genamt,
        presence_penalty: preset.presence_pen,
        response_format: 'text',
        seed: preset.seed, 
        stop: ["\n\n\n\n\n", currentInstruct.input_sequence],
        stream: true,
        temperature: preset.temp,
        top_p: preset.top_p,
        top_k: preset.top_a,
    }
}

// Fetch Response

const KAIresponse = (setAbortFunction, insertGeneratedMessage, messages) => {
    
    const kaiendpoint = getString(Global.KAIEndpoint)
    console.log(`Using KAI`)

    readableStreamResponse( 
        `${kaiendpoint}/api/extra/generate/stream`,
        JSON.stringify(constructKAIPayload(messages)),
        insertGeneratedMessage, 
        (item) => {return JSON.parse(item.substring(5)).token},
        setAbortFunction,
        () => {
            axios
            .create({timeout: 1000})
            .post(`${kaiendpoint}/api/extra/abort`)
            .catch(() => {ToastAndroid.show(`Abort Failed`, 2000)})
        }
    )
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

const OldTGWUIReponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {
    
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

const TGWUIReponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {

    const endpoint = getString(Global.TGWUIStreamingEndpoint)

    readableStreamResponse( 
        `${endpoint}/v1/completions`,
        JSON.stringify(constructTGWUIPayload(messages)),
        insertGeneratedMessage, 
        (item) => {return JSON.parse(item.substring(5)).choices[0].text},
        setAbortFunction
    )
}

const MancerResponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {
    
    const mancerKey = getString(Global.MancerKey)
    const mancerModel = getObject(Global.MancerModel)

    const check = await fetch(`https://neuro.mancer.tech/oai/v1/models/${mancerModel.id}`, {
    method: 'GET',
    headers: {'X-API-KEY': mancerKey}
    })
    
    if(check.status !== 200) {
        console.log(await(check.json()))
        setValue(Global.NowGenerating, false)
        ToastAndroid.show(`Invalid Model or API key!`, 3000)
        return
    }
    

    readableStreamResponse( 
        `https://neuro.mancer.tech/oai/v1/completions`,
        JSON.stringify(constructMancerPayload(messages)),
        insertGeneratedMessage, 
        (item) => {
            if(item == 'data: [DONE]')
                return ''
            return JSON.parse(item.substring(5)).choices[0].text
        },
        setAbortFunction,
        () => {},
        {'X-API-KEY': getString(Global.MancerKey)}
    )
}

const CompletionsResponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {
    
    const endpoint = getString(Global.CompletionsEndpoint)

    readableStreamResponse( 
        `${endpoint}/v1/completions`,
        JSON.stringify(constructCompletionsPayload(messages)),
        insertGeneratedMessage, 
        (item) => {
            if(item == 'data: [DONE]')
                return ''
            return JSON.parse(item.substring(5)).choices[0].text
        },
        setAbortFunction,
        () => {},
        {'X-API-KEY': getString(Global.CompletionsKey)}
    )
}

const openRouterResponseStream = async (setAbortFunction, insertGeneratedMessage, messages) => {
    readableStreamResponse( 
        "https://openrouter.ai/api/v1/chat/completions",
        JSON.stringify(constructOpenRouterPayload(messages)),
        insertGeneratedMessage, 
        (item) => {
            if(item == 'data: [DONE]')
                return ''
            return JSON.parse(item.substring(5)).choices[0]?.delta?.content ?? ''
        },
        setAbortFunction,
        () => {},
        {'Authorization':`Bearer ${getString(Global.OpenRouterKey)}`}
    )
}

const readableStreamResponse = (endpoint , payload, insertGeneratedMessage, jsonreader, setAbortFunction, abort_func = () => {}, header = {}) => {
    
    const timeout = setTimeout(() => controller.abort(), 10000);
    let aborted = false
    
    const controller = new AbortController();

    setAbortFunction(abortFunction => () => {
        controller.abort()
        aborted = true
        setValue(Global.NowGenerating, false)
        abort_func()
    })
    
    fetch(endpoint, {
        reactNative: {textStreaming: true},
        method: `POST`,
        body: payload,
        signal: controller.signal,
        headers: {
            "accept": "application/json",
            "Content-Type" : "application/json",
            ...header
        }
    })
    .then(async (response) => {

        clearTimeout(timeout)
        console.log(`Response status: ${response.status}`)
        if(response.status != 200) {
            ToastAndroid.show(`Something went wrong. Error ${response.status}`, 2000)
        }
        const reader = response.body.getReader()
        return reader.read().then(function processText ({done, value}) {
            if(done || aborted) {
                stopGenerating()
                insertGeneratedMessage('', true)					
                console.log('Done')
                return
            }
            const text = new TextDecoder().decode(value)
            let events = text.split('\n')
            for(e of events)
            {
                // console.log(e)
                if(e.startsWith('data')) {	
                    const data = jsonreader(e)
                    insertGeneratedMessage(data)	
                }
            }
            return reader.read().then(processText)
        })

    }).catch((error) => {
        stopGenerating()
        if(!aborted)
            ToastAndroid.show('Connection Lost...', ToastAndroid.SHORT)
        console.log('Response failed: ' + error)
    })
}

const localStreamResponse = async (setAbortFunction, insertGeneratedMessage, messages) => {

    setAbortFunction(abortFunction => async () => {
        Llama.stopCompletion().then(() => {
            setValue(Global.NowGenerating, false)
        })
    })

    Llama.completion(constructLocalPayload(messages), insertGeneratedMessage).then(() => {
        setValue(Global.NowGenerating, false)
    })

}