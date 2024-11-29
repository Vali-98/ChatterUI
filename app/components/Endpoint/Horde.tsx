import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { Global, Logger, Style } from 'constants/Global'
import { hordeHeader } from 'constants/APIState/HordeAPI'
import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import { MultiSelect } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

type HordeProps = {
    item: HordeModel
    unSelect?: (item: HordeModel) => void
    hordeWorkers?: HordeWorker[]
}

const HordeItem: React.FC<HordeProps> = ({ item, unSelect, hordeWorkers }) => {
    return (
        <View style={styles.iteminfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                    style={{
                        color: Style.getColor('primary-text1'),
                        flex: 1,
                        fontSize: 16,
                    }}>
                    {item.name}
                </Text>
                <TouchableOpacity onPress={() => unSelect && unSelect(item)}>
                    <MaterialIcons
                        name="delete"
                        color={Style.getColor('primary-text1')}
                        size={28}
                    />
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row' }}>
                <View>
                    <Text style={{ color: Style.getColor('primary-text2') }}>Workers</Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>Performance</Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>ETA</Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>Context Limit</Text>
                </View>
                <View style={{ marginLeft: 8 }}>
                    <Text style={{ color: Style.getColor('primary-text2') }}>: {item.count}</Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>
                        : {item.performance}
                    </Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>: {item.eta}s</Text>
                    <Text style={{ color: Style.getColor('primary-text2') }}>
                        {`: ${hordeWorkers && getContextSize(item, hordeWorkers)}`}
                    </Text>
                </View>
            </View>
        </View>
    )
}

const Horde = () => {
    const [hordeKey, setHordeKey] = useMMKVString(Global.HordeKey)
    const [hordeModels, setHordeModels] = useMMKVObject<HordeModel[]>(Global.HordeModels)
    const [hordeWorkers, setHordeWorkers] = useMMKVObject<HordeWorker[]>(Global.HordeWorkers)

    const [keyInput, setKeyInput] = useState('')
    const [modelList, setModelList] = useState([])

    const getModels = async () => {
        const modelresults = await fetch(
            `https://aihorde.net/api/v2/status/models?type=text&model_state=all`,
            {
                method: 'GET',
                headers: { ...hordeHeader(), accept: 'application/json' },
            }
        ).catch((error) => {
            Logger.log(`Could Not Connect To Horde`, true)
            Logger.log(`${error}`)
        })
        if (!modelresults) return

        const list = await modelresults.json()
        const names = list.map((item: HordeModel) => {
            return item.name
        })
        // setDropdownValues(dropdownValues.filter((item) => names.includes(item)))
        setModelList(list)
        if (hordeModels) setHordeModels(hordeModels.filter((item) => names.includes(item.name)))

        const workerresults = await fetch(`https://aihorde.net/api/v2/workers?type=text`, {
            method: 'GET',
            ...hordeHeader(),
        }).catch(() => {
            Logger.log(`Could not connect to horde`, true)
        })
        if (workerresults) {
            const workerlist = await workerresults.json()
            setHordeWorkers(workerlist)
        }
    }

    useEffect(() => {
        getModels()
    }, [])

    const listRef = useRef()

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>API Key</Text>
            <Text style={styles.subtitle}>Key will not be shown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={styles.input}
                    value={keyInput}
                    onChangeText={(value) => {
                        setKeyInput(value)
                    }}
                    placeholder="Press save to confirm key"
                    placeholderTextColor={Style.getColor('primary-text2')}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        if (keyInput === '') {
                            Logger.log(`No API Key provided!`, true)
                            return
                        }
                        setHordeKey(keyInput)
                        setKeyInput('')
                        Logger.log(`Key Saved!`, true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>Models</Text>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingTop: 8,
                    marginBottom: 8,
                }}>
                <MultiSelect
                    value={
                        hordeModels?.map((item) => {
                            return item.name
                        }) ?? []
                    }
                    data={modelList}
                    labelField="name"
                    valueField="name"
                    onChange={(item) => {
                        setHordeModels(
                            modelList.filter((value: HordeModel) => {
                                return item.includes(value.name)
                            })
                        )
                        //setDropdownValues(item)
                    }}
                    {...Style.drawer.default}
                    placeholderStyle={{
                        color: Style.getColor(
                            hordeModels && hordeModels?.length === 0
                                ? 'primary-text2'
                                : 'primary-text1'
                        ),
                    }}
                    placeholder={
                        hordeModels?.length === 0
                            ? 'Select Model'
                            : `Selected ${hordeModels?.length} ${
                                  hordeModels && hordeModels?.length > 1 ? 'models' : 'model'
                              }`
                    }
                    visibleSelectedItem={false}
                    /*renderSelectedItem={(item: HordeModel, unSelect) => (
                    <HordeItem item={item} unSelect={unSelect} hordeWorkers={hordeWorkers} />

                )}*/
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        getModels()
                    }}>
                    <MaterialIcons
                        name="refresh"
                        color={Style.getColor('primary-text1')}
                        size={24}
                    />
                </TouchableOpacity>
            </View>
            <View>
                {hordeModels?.map((item, index) => (
                    <HordeItem
                        key={item.name}
                        item={item}
                        unSelect={() => {
                            const models = hordeModels
                            models.splice(index, 1)
                            setHordeModels(models)
                        }}
                        hordeWorkers={hordeWorkers}
                    />
                ))}
            </View>
        </View>
    )
}

export default Horde

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        flex: 1,
    },

    title: {
        paddingTop: 8,
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    input: {
        flex: 1,
        color: Style.getColor('primary-text1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    button: {
        padding: 5,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },

    dropdownContainer: {
        marginVertical: 16,
    },

    iteminfo: {
        width: '100%',
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        marginTop: 8,
        marginRight: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
})

type HordeModel = {
    name: string
    count: number
    performance: number
    queued: number
    jobs: number
    eta: number
    type: 'image' | 'text'
}

type HordeWorker = {
    type: 'image' | 'text'
    name: string
    id: string
    online: boolean
    requests_fulfilled: number
    kudos_rewards: number
    kudos_details: {
        generated: number
        uptime: number
    }
    performance: string
    threads: number
    uptime: number
    maintenance_mode: boolean
    paused: boolean
    info: string
    nsfw: boolean
    owner: string
    ipaddr: string
    trusted: boolean
    flagged: boolean
    suspicious: number
    uncompleted_jobs: number
    models: string[]
    forms: string[]
    team: {
        name: string
        id: string
    }
    contact: string
    bridge_agent: string
    max_pixels: number
    megapixelsteps_generated: number
    img2img: boolean
    painting: boolean
    'post-processing': boolean
    lora: boolean
    max_length: number
    max_context_length: number
    tokens_generated: number
}

const getContextSize = (item: HordeModel, workers: HordeWorker[]) => {
    const size = workers
        ?.filter((worker) => {
            return worker.models.includes(item.name)
        })
        .reduce((acc, worker) => Math.min(acc, worker.max_context_length), Number.MAX_VALUE)
    return size === Number.MAX_VALUE ? 'Unknown' : size
}
