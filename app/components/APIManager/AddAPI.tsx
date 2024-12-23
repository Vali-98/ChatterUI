import ButtonPrimary from '@components/Buttons/ButtonPrimary'
import DropdownSheet from '@components/DropdownSheet'
import HeartbeatButton from '@components/Endpoint/HeartbeatButton'
import MultiDropdownSheet from '@components/MultiDropdownSheet'
import claudeModels from '@constants/API/ClaudeModels.json'
import { MaterialIcons } from '@expo/vector-icons'
import { APIManagerValue, APIState } from 'constants/API/APIManagerState'
import { Logger, Style } from 'constants/Global'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const AddAPI = () => {
    const router = useRouter()
    const { addValue, getTemplates } = APIState.useAPIState((state) => ({
        getTemplates: state.getTemplates,
        addValue: state.addValue,
    }))

    const [template, setTemplate] = useState(getTemplates()[0])
    const [values, setValues] = useState<APIManagerValue>({
        ...template.defaultValues,
        configName: template.name,
        friendlyName: 'New API',
        active: true,
    })
    const [modelList, setModelList] = useState<any[]>([])

    const handleGetModelList = async () => {
        if (!template.features.useModel) return
        if (template.defaultValues.modelEndpoint === '{{CLAUDE}}') {
            setModelList(claudeModels.models)
            return
        }
        let auth: any = {}
        if (template.features.useKey) {
            auth = { [template.request.authHeader]: template.request.authPrefix + values.key }
        }
        const result = await fetch(values.modelEndpoint, { headers: { ...auth } })
        const data = await result.json()
        if (result.status !== 200) {
            Logger.log(`Could not retrieve models: ${data?.error?.message}`)
            return
        }
        const models = getNestedValue(data, template.model.modelListParser)
        setModelList(models)
    }

    useEffect(() => {
        handleGetModelList()
    }, [template])

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen options={{ title: 'Add Connection' }} />
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <DropdownSheet
                    style={{ marginBottom: 8 }}
                    data={getTemplates()}
                    labelExtractor={(template) => template.name}
                    selected={template}
                    onChangeValue={(item) => {
                        setTemplate(item)
                        setValues({
                            ...item.defaultValues,
                            friendlyName: values.friendlyName,
                            active: true,
                            configName: item.name,
                        })
                    }}
                    modalTitle="Select Connection Type"
                    search
                />

                <View>
                    <Text style={styles.title}>Friendly Name</Text>
                    <TextInput
                        style={styles.input}
                        value={values.friendlyName}
                        onChangeText={(value) => {
                            setValues({ ...values, friendlyName: value })
                        }}
                        placeholder={template.defaultValues.endpoint}
                        placeholderTextColor={Style.getColor('primary-text2')}
                    />
                </View>

                {template.ui.editableCompletionPath && (
                    <View>
                        <Text style={styles.title}>Completion URL</Text>
                        <Text style={styles.subtitle}>Note: Use full URL path</Text>
                        <TextInput
                            style={styles.input}
                            value={values.endpoint}
                            onChangeText={(value) => {
                                setValues({ ...values, endpoint: value })
                            }}
                            placeholder={template.defaultValues.endpoint}
                            placeholderTextColor={Style.getColor('primary-text2')}
                        />
                    </View>
                )}

                {template.ui.editableModelPath && (
                    <View>
                        <Text style={styles.title}>Model URL</Text>
                        <Text style={styles.subtitle}>Note: Use full URL path</Text>
                        <TextInput
                            style={styles.input}
                            value={values.modelEndpoint}
                            onChangeText={(value) => {
                                setValues({ ...values, modelEndpoint: value })
                            }}
                            placeholder={template.defaultValues.modelEndpoint}
                            placeholderTextColor={Style.getColor('primary-text2')}
                        />
                        <HeartbeatButton
                            api={values.modelEndpoint ?? ''}
                            apiFormat={(s) => s}
                            headers={
                                template.features.useKey
                                    ? {
                                          [template.request.authHeader]:
                                              template.request.authPrefix + values.key,
                                      }
                                    : {}
                            }
                        />
                    </View>
                )}

                {template.features.useKey && (
                    <View>
                        <Text style={styles.title}>API Key</Text>
                        <Text style={styles.subtitle}>Key will not be shown</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={styles.input}
                                value={values.key}
                                onChangeText={(value) => {
                                    setValues({ ...values, key: value })
                                }}
                                placeholder="Press save to confirm key"
                                placeholderTextColor={Style.getColor('primary-text2')}
                                secureTextEntry
                            />
                        </View>
                    </View>
                )}

                {template.features.useModel && (
                    <View style={styles.dropdownContainer}>
                        <Text style={styles.title}>Model</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!template.features.multipleModels && (
                                <DropdownSheet
                                    selected={values.model}
                                    data={modelList}
                                    labelExtractor={(value) => {
                                        return getNestedValue(value, template.model.nameParser)
                                    }}
                                    onChangeValue={(item) => {
                                        setValues({ ...values, model: item })
                                    }}
                                    search={modelList.length > 10}
                                    modalTitle="Select Model"
                                />
                            )}
                            {template.features.multipleModels && (
                                <MultiDropdownSheet
                                    selected={values?.model ?? []}
                                    data={modelList}
                                    labelExtractor={(value) => {
                                        return getNestedValue(value, template.model.nameParser)
                                    }}
                                    onChangeValue={(item) => {
                                        setValues({ ...values, model: item })
                                    }}
                                    search={modelList.length > 10}
                                    modalTitle="Select Model"
                                />
                            )}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => {
                                    handleGetModelList()
                                }}>
                                <MaterialIcons
                                    name="refresh"
                                    color={Style.getColor('primary-text1')}
                                    size={24}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {template.features.useFirstMessage && (
                    <View>
                        <Text style={styles.title}>First Message</Text>
                        <Text style={styles.subtitle}>Default first message sent to Claude</Text>
                        <TextInput
                            style={{ ...styles.input, textAlignVertical: 'top' }}
                            value={values.firstMessage}
                            onChangeText={(value) => {
                                setValues({ ...values, firstMessage: value })
                            }}
                            numberOfLines={4}
                            placeholder="..."
                            placeholderTextColor={Style.getColor('primary-text2')}
                        />
                    </View>
                )}
                {template.features.usePrefill && (
                    <View>
                        <Text style={styles.title}>Prefill</Text>
                        <Text style={styles.subtitle}>Leave blank to use default endpoint</Text>
                        <TextInput
                            style={{ ...styles.input, textAlignVertical: 'top' }}
                            value={values.prefill}
                            onChangeText={(value) => {
                                setValues({ ...values, prefill: value })
                            }}
                            numberOfLines={4}
                            placeholder="This prefill occurs on the final assistant message"
                            placeholderTextColor={Style.getColor('primary-text2')}
                        />
                    </View>
                )}
            </ScrollView>
            <ButtonPrimary
                label="Create API"
                onPress={() => {
                    addValue(values)
                    router.back()
                }}
            />
        </View>
    )
}

export default AddAPI

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
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
        paddingHorizontal: 8,
        paddingVertical: 8,
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
        marginTop: 16,
    },

    modelInfo: {
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
})

const getNestedValue = (obj: any, path: string) => {
    if (path === '') return obj
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
