import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import HeartbeatButton from '@components/buttons/HeartbeatButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import BottomSheet from '@components/views/BottomSheet'
import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { APIConfiguration, APIValues } from '@lib/engine/API/APIBuilder.types'
import { APIManager, APIManagerValue } from '@lib/engine/API/APIManagerState'
import { useDebounce } from '@lib/hooks/Debounce'
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
    const { t } = useTranslation()

    const { editValue, getTemplates, removeValue } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            removeValue: state.removeValue,
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
            Logger.errorToast(t('connections.editor.invalidTemplate'))
            close()
            return
        }
        if (newTemplate.name !== template.name) setTemplate(newTemplate)
    }, [close, values, getTemplates, t, template])

    const handleGetModelList = useCallback(
        async (values: APIValues) => {
            if (!template.features.useModel || !show) return
            const auth: any = {}
            if (template.features.useKey) {
                auth[template.request.authHeader] = template.request.authPrefix + values.key
                if (template.name === 'Claude') {
                    auth['anthropic-version'] = CLAUDE_VERSION
                }
            }
            const result = await fetch(values.modelEndpoint, { headers: { ...auth } })
            if (result.status !== 200) {
                Logger.error(t('connections.add.error.200', { error: `${result.status}` }))
                return
            }

            const data = await result.json().catch(() => null)
            if (!data) return

            const models = getNestedValue(data, template.model.modelListParser)
            setModelList(models)
        },
        [show, template, t]
    )

    const debouncedModelList = useDebounce(handleGetModelList, 300)
    // TODO: Replace with react query
    useEffect(() => {
        setValues(originalValues)
    }, [originalValues])

    useEffect(() => {
        debouncedModelList(values)
    }, [debouncedModelList, values])

    const handleDelete = () => {
        Alert.alert({
            title: t('connections.item.delete.title'),
            description: t('connections.item.delete.description', {
                name: originalValues.friendlyName,
            }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('connections.item.delete.button'),
                    onPress: () => {
                        removeValue(index)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <BottomSheet
            sheetStyle={{ flex: 2, maxHeight: '80%' }}
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
                    {t('connections.editor.title')}
                </Text>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 12, paddingBottom: 32 }}>
                    <ThemedTextInput
                        label={t('connections.editor.friendlyName')}
                        value={values.friendlyName}
                        onChangeText={(value) => {
                            setValues({ ...values, friendlyName: value })
                        }}
                    />

                    {template.ui.editableCompletionPath && (
                        <View>
                            <ThemedTextInput
                                label={t('connections.editor.completionUrl')}
                                value={values.endpoint}
                                onChangeText={(value) => {
                                    setValues({ ...values, endpoint: value })
                                }}
                            />
                            <Text style={styles.hintText}>
                                {t('connections.editor.fullUrlHint')}
                            </Text>
                        </View>
                    )}

                    {template.features.useKey && (
                        <ThemedTextInput
                            secureTextEntry
                            label={t('connections.editor.apiKey')}
                            value={values.key}
                            onChangeText={(value) => {
                                setValues({ ...values, key: value })
                            }}
                        />
                    )}

                    {template.ui.editableModelPath && (
                        <View>
                            <ThemedTextInput
                                label={t('connections.editor.modelUrl')}
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
                                callback={() => handleGetModelList(values)}
                            />
                        </View>
                    )}

                    {template.features.useModel && (
                        <View style={{ rowGap: 4 }}>
                            <Text style={styles.title}>{t('connections.editor.model')}</Text>
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
                                        modalTitle={t('connections.editor.selectModel')}
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
                                        modalTitle={t('connections.editor.selectModel')}
                                    />
                                )}
                            </View>
                        </View>
                    )}

                    {template.features.useFirstMessage && (
                        <View>
                            <ThemedTextInput
                                label={t('connections.editor.firstMessage')}
                                value={values.firstMessage}
                                onChangeText={(value) => {
                                    setValues({ ...values, firstMessage: value })
                                }}
                            />
                            <Text style={styles.hintText}>
                                {t('connections.editor.firstMessageHint')}
                            </Text>
                        </View>
                    )}
                    {template.features.usePrefill && (
                        <View>
                            <ThemedTextInput
                                label={t('connections.editor.prefill')}
                                value={values.prefill}
                                onChangeText={(value) => {
                                    setValues({ ...values, prefill: value })
                                }}
                            />
                            <Text style={styles.hintText}>
                                {t('connections.editor.prefillHint')}
                            </Text>
                        </View>
                    )}
                </ScrollView>
                <View
                    style={{
                        flexDirection: 'row',
                        paddingTop: 8,
                        justifyContent: 'space-between',
                    }}>
                    <ThemedButton
                        variant="critical"
                        iconName="delete"
                        label={t('common.actions.delete')}
                        onPress={handleDelete}
                    />
                    <ThemedButton
                        variant="tertiary"
                        iconName="reload"
                        label={t('common.actions.reset')}
                        onPress={() => {
                            setValues(originalValues)
                        }}
                    />
                    <ThemedButton
                        variant="secondary"
                        label={t('common.actions.save')}
                        iconName="save"
                        onPress={() => {
                            editValue(values, index)
                            close()
                        }}
                    />
                </View>
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
