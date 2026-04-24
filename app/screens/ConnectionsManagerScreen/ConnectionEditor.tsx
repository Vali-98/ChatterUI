import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import HeartbeatButton from '@components/buttons/HeartbeatButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import BottomSheet from '@components/views/BottomSheet'
import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { APIConfiguration } from '@lib/engine/API/APIBuilder.types'
import { APIManager, APIManagerValue } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getNestedValue } from '@lib/utils/Parsing'

type ConnectionEditorProps = {
    index: number
    show: boolean
    close: () => void
    originalValues: APIManagerValue
}

const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
    index,
    show,
    close,
    originalValues,
}) => {
    const { color, fontSize } = Theme.useTheme()
    const styles = useStyles()

    const { editValue, getTemplates } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            getTemplates: state.getTemplates,
            editValue: state.editValue,
        }))
    )

    const [template, setTemplate] = useState<APIConfiguration>(getTemplates()[0])

    const [values, setValues] = useState<APIManagerValue>(originalValues)
    const [modelList, setModelList] = useState<any[]>([])

    useEffect(() => {
        const newTemplate = getTemplates().find((item) => item.name === values.configName)
        if (!newTemplate) {
            Logger.errorToast('Could not get valid template!')
            close()
            return
        }

        setTemplate(newTemplate)
    }, [close, values, getTemplates])

    const handleGetModelList = useCallback(async () => {
        if (!template.features.useModel || !show) return
        const auth: any = {}
        if (template.features.useKey) {
            auth[template.request.authHeader] = template.request.authPrefix + values.key
            if (template.name === 'Claude') {
                auth['anthropic-version'] = CLAUDE_VERSION
            }
        }
        const result = await fetch(values.modelEndpoint, { headers: { ...auth } })
        const data = await result.json()
        if (result.status !== 200) {
            Logger.error(`Could not retrieve models: ${data?.error?.message}`)
            return
        }
        const models = getNestedValue(data, template.model.modelListParser)
        setModelList(models)
    }, [show, template, values])
    // TODO: Replace with react query
    useEffect(() => {
        setValues(originalValues)
        handleGetModelList()
    }, [originalValues, handleGetModelList])

    return (
        <BottomSheet
            sheetStyle={{ flex: 2 }}
            visible={show}
            onClose={close}
            setVisible={(v) => {
                if (v) return
                close()
            }}>
            <View style={styles.mainContainer}>
                <Text
                    style={{
                        color: color.text._100,
                        fontSize: fontSize.xl2,
                        fontWeight: '500',
                        paddingBottom: 16,
                    }}>
                    Edit Connection
                </Text>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 12, paddingBottom: 32 }}>
                    <ThemedTextInput
                        label="Friendly Name"
                        value={values.friendlyName}
                        onChangeText={(value) => {
                            setValues({ ...values, friendlyName: value })
                        }}
                    />

                    {template.ui.editableCompletionPath && (
                        <View>
                            <ThemedTextInput
                                label="Completion URL"
                                value={values.endpoint}
                                onChangeText={(value) => {
                                    setValues({ ...values, endpoint: value })
                                }}
                            />
                            <Text style={styles.hintText}>Note: Use full URL path</Text>
                        </View>
                    )}

                    {template.ui.editableModelPath && (
                        <View>
                            <ThemedTextInput
                                label="Model URL"
                                value={values.modelEndpoint}
                                onChangeText={(value) => {
                                    setValues({ ...values, modelEndpoint: value })
                                }}
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
                                callback={handleGetModelList}
                            />
                        </View>
                    )}

                    {template.features.useKey && (
                        <ThemedTextInput
                            secureTextEntry
                            label="API Key"
                            value={values.key}
                            onChangeText={(value) => {
                                setValues({ ...values, key: value })
                            }}
                        />
                    )}

                    {template.features.useModel && (
                        <View style={{ rowGap: 4 }}>
                            <Text style={styles.title}>Model</Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    columnGap: 8,
                                }}>
                                {!template.features.multipleModels && (
                                    <DropdownSheet
                                        containerStyle={{ flex: 1 }}
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
                                        containerStyle={{ flex: 1 }}
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
                                <ThemedButton
                                    onPress={() => {
                                        handleGetModelList()
                                    }}
                                    iconName="reload"
                                    iconSize={18}
                                    variant="secondary"
                                />
                            </View>
                        </View>
                    )}

                    {template.features.useFirstMessage && (
                        <View>
                            <ThemedTextInput
                                label="First Message"
                                value={values.firstMessage}
                                onChangeText={(value) => {
                                    setValues({ ...values, firstMessage: value })
                                }}
                            />
                            <Text style={styles.hintText}>
                                Default first message sent to Claude
                            </Text>
                        </View>
                    )}
                    {template.features.usePrefill && (
                        <View>
                            <ThemedTextInput
                                label="Prefill"
                                value={values.prefill}
                                onChangeText={(value) => {
                                    setValues({ ...values, prefill: value })
                                }}
                            />
                            <Text style={styles.hintText}>Prefill before model response</Text>
                        </View>
                    )}
                </ScrollView>
                <ThemedButton
                    label="Save Changes"
                    onPress={() => {
                        editValue(values, index)
                        close()
                    }}
                />
            </View>
        </BottomSheet>
    )
}

export default ConnectionEditor

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            flex: 1,
        },

        title: {
            color: color.text._100,
        },

        hintText: {
            paddingTop: spacing.s,
            color: color.text._400,
        },
    })
}
