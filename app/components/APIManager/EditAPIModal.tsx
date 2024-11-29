import ButtonPrimary from '@components/Buttons/ButtonPrimary'
import FadeBackrop from '@components/FadeBackdrop'
import { APIConfiguration } from '@constants/API/APIBuilder.types'
import claudeModels from '@constants/API/ClaudeModels.json'
import { MaterialIcons } from '@expo/vector-icons'
import { APIManagerValue, APIState } from 'constants/API/APIManagerState'
import { Logger, Style } from 'constants/Global'
import { useEffect, useState } from 'react'
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

type EditAPIModalProps = {
    index: number
    show: boolean
    close: () => void
    originalValues: APIManagerValue
}

const EditAPIModal: React.FC<EditAPIModalProps> = ({ index, show, close, originalValues }) => {
    const { editValue, getTemplates } = APIState.useAPIState((state) => ({
        getTemplates: state.getTemplates,
        editValue: state.editValue,
    }))

    const [template, setTemplate] = useState<APIConfiguration>(getTemplates()[0])

    const [values, setValues] = useState<APIManagerValue>(originalValues)
    const [modelList, setModelList] = useState<any[]>([])

    useEffect(() => {
        const newTemplate = getTemplates().find((item) => item.name === values.configName)
        if (!newTemplate) {
            Logger.log('Could not get valid template!', true)
            close()
            return
        }

        setTemplate(newTemplate)
    }, [])

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
        <Modal
            transparent
            onRequestClose={close}
            statusBarTranslucent
            visible={show}
            animationType="fade">
            <FadeBackrop
                handleOverlayClick={() => {
                    close()
                }}
            />
            <View style={{ flex: 1 }} />
            <View style={styles.mainContainer}>
                <Text
                    style={{
                        color: Style.getColor('primary-text1'),
                        fontSize: 20,
                        fontWeight: '500',
                        paddingBottom: 24,
                    }}>
                    Edit Connection
                </Text>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
                                <Dropdown
                                    value={values.model}
                                    data={modelList}
                                    labelField={template.model.nameParser}
                                    valueField={template.model.nameParser}
                                    onChange={(item) => {
                                        // if same return
                                        setValues({ ...values, model: item })
                                    }}
                                    placeholder="Select Model"
                                    {...Style.drawer.default}
                                />
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
                            <Text style={styles.subtitle}>
                                Default first message sent to Claude
                            </Text>
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
                    buttonStyle={{ marginTop: 8 }}
                    label="Save Changes"
                    onPress={() => {
                        editValue(values, index)
                        close()
                    }}
                />
            </View>
        </Modal>
    )
}

export default EditAPIModal

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: '70%',
        backgroundColor: Style.getColor('primary-surface1'),
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
