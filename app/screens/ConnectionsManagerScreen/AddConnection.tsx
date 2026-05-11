import { Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import HeartbeatButton from '@components/buttons/HeartbeatButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { APIManagerValue, APIManager } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getNestedValue } from '@lib/utils/Parsing'

const AddConnection = () => {
    const styles = useStyles()
    const { t } = useTranslation()
    const router = useRouter()
    const { addValue, getTemplates } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            getTemplates: state.getTemplates,
            addValue: state.addValue,
        }))
    )

    const [template, setTemplate] = useState(getTemplates()[0])
    const [values, setValues] = useState<APIManagerValue>({
        ...template.defaultValues,
        configName: template.name,
        friendlyName: t('connections.add.defaultFriendlyName'),
        active: true,
    })
    const [modelList, setModelList] = useState<any[]>([])

    const handleGetModelList = useCallback(async () => {
        if (!template.features.useModel) return

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
            Logger.error(t('connections.add.error.200', { error: `${data?.error?.message}` }))
            return
        }
        const models = getNestedValue(data, template.model.modelListParser)
        const isArray = Array.isArray(models)
        if (!models || !isArray) {
            Logger.warn(t('connections.add.error.modelparse'))
            if (!models) {
                Logger.error(t('connections.add.error.modelundef'))
            } else if (!isArray) {
                Logger.error(t('connections.add.error.nonarray'))
            }
            return
        }
        setModelList(models)
    }, [template, values, t])

    useEffect(() => {
        handleGetModelList()
    }, [template, handleGetModelList])

    return (
        <SafeAreaView edges={['bottom']} style={styles.mainContainer}>
            <Stack.Screen options={{ title: t('connections.add.title') }} />
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ rowGap: 16, paddingBottom: 24 }}>
                <DropdownSheet
                    style={{ marginBottom: 8 }}
                    data={getTemplates()}
                    labelExtractor={(template) => template.name}
                    selected={template}
                    onChangeValue={(item) => {
                        setTemplate(item)
                        setModelList([])
                        setValues({
                            ...item.defaultValues,
                            friendlyName: values.friendlyName,
                            active: true,
                            configName: item.name,
                            model: undefined,
                        })
                    }}
                    modalTitle={t('connections.add.selectConnectionType')}
                    search
                />

                <ThemedTextInput
                    label={t('connections.add.friendlyName')}
                    value={values.friendlyName}
                    onChangeText={(value) => {
                        setValues({ ...values, friendlyName: value })
                    }}
                />

                {template.ui.editableCompletionPath && (
                    <View>
                        <ThemedTextInput
                            label={t('connections.add.completionUrl')}
                            value={values.endpoint}
                            onChangeText={(value) => {
                                setValues({ ...values, endpoint: value })
                            }}
                        />
                        <Text style={styles.hintText}>{t('connections.add.fullUrlHint')}</Text>
                    </View>
                )}

                {template.ui.editableModelPath && (
                    <View>
                        <ThemedTextInput
                            label={t('connections.add.modelUrl')}
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
                        label={t('connections.add.apiKey')}
                        secureTextEntry
                        value={values.key}
                        onChangeText={(value) => {
                            setValues({ ...values, key: value })
                        }}
                    />
                )}

                {template.features.useModel && (
                    <View>
                        <Text style={styles.title}>{t('connections.add.model')}</Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                columnGap: 8,
                                marginTop: 8,
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
                                    modalTitle={t('connections.add.selectModel')}
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
                                    modalTitle={t('connections.add.selectModel')}
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
                            label={t('connections.add.firstMessage')}
                            value={values.firstMessage}
                            onChangeText={(value) => {
                                setValues({ ...values, firstMessage: value })
                            }}
                        />
                        <Text style={styles.hintText}>{t('connections.add.firstMessageHint')}</Text>
                    </View>
                )}
                {template.features.usePrefill && (
                    <View>
                        <ThemedTextInput
                            label={t('connections.add.prefill')}
                            value={values.prefill}
                            onChangeText={(value) => {
                                setValues({ ...values, prefill: value })
                            }}
                        />
                        <Text style={styles.hintText}>{t('connections.add.prefillHint')}</Text>
                    </View>
                )}
            </ScrollView>
            <ThemedButton
                label={t('connections.add.createButton')}
                onPress={() => {
                    addValue(values)
                    router.back()
                }}
            />
        </SafeAreaView>
    )
}

export default AddConnection

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            marginVertical: spacing.xl,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl,
            flex: 1,
        },

        title: {
            paddingTop: spacing.m,
            color: color.text._100,
            fontSize: spacing.xl,
        },

        hintText: {
            marginTop: spacing.s,
            color: color.text._400,
        },

        modelInfo: {
            borderRadius: spacing.m,
            backgroundColor: color.neutral._200,
            flex: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.l,
            paddingBottom: spacing.xl2,
        },
    })
}
