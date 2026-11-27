import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import ListButton from '@components/buttons/ListButton'
import ThemedButton from '@components/buttons/ThemedButton'
import Aicons, { AiconsGlyphName } from '@components/icons/Aicons'
import DropdownSheet from '@components/input/DropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import BottomSheet, { useBottomSheetRef } from '@components/views/BottomSheet'
import ListCard from '@components/views/ListCard'
import { CLAUDE_VERSION } from '@lib/constants/generation'
import { APIConfiguration, APIValues } from '@lib/engine/API/APIBuilder.types'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { defaultTemplates } from '@lib/engine/API/DefaultAPI'
import {
    getModelEndpoint,
    isConnectionReady,
    requiresConnectionKey,
} from '@lib/onboarding/connection'
import { Theme } from '@lib/theme/ThemeManager'
import { getNestedValue } from '@lib/utils/Parsing'

export type ConnectionDraft = APIValues & { friendlyName: string }
// Template identifiers, matching the connection configuration names.
const PROVIDER_NAMES = ['OpenAI', 'Google AI Studio', 'Open Router', 'Claude']

const ConnectionSetup = ({
    value: confirmedValue,
    onChange: confirmValue,
}: {
    value?: ConnectionDraft
    onChange: (value: ConnectionDraft | undefined) => void
}) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const sheet = useBottomSheetRef()
    const [editing, setEditing] = useState<{ template: APIConfiguration; value: ConnectionDraft }>()
    const [showAll, setShowAll] = useState(false)
    const customTemplates = useConnectionStore((state) => state.customTemplates)
    const templates = useMemo(() => [...defaultTemplates, ...customTemplates], [customTemplates])
    const choose = (template: APIConfiguration) => {
        const value =
            confirmedValue?.configName === template.name
                ? confirmedValue
                : {
                      ...template.defaultValues,
                      configName: template.name,
                      friendlyName: template.name,
                      ...(template.name === 'Chat Completions' && {
                          endpoint: '',
                          modelEndpoint: '',
                          friendlyName: t('onboarding.selfHosted'),
                      }),
                  }
        setEditing({ template, value })
        sheet.current?.open()
    }
    const confirmedTemplate = templates.find((item) => item.name === confirmedValue?.configName)
    if (isConnectionReady(confirmedValue, confirmedTemplate) && confirmedValue) {
        return (
            <Animated.View entering={FadeIn.duration(250)} style={{ gap: 24 }}>
                <TText size={28} style={{ fontWeight: '600' }}>
                    {t('onboarding.connectionReady')}
                </TText>
                <ListCard active={false} style={{ padding: 16, alignItems: 'center', gap: 14 }}>
                    <Aicons
                        name={(confirmedTemplate?.ui.display?.icon ?? 'link') as AiconsGlyphName}
                        size={20}
                        color={color.text._400}
                    />
                    <TText size={16} style={{ flex: 1 }}>
                        {confirmedValue.friendlyName}
                    </TText>
                    <TText color="400">{t('onboarding.configured')}</TText>
                </ListCard>
                <TText color="400">{t('onboarding.connectionReadyHint')}</TText>
                <ThemedButton
                    variant="tertiary"
                    label={t('common.actions.reset')}
                    level="muted"
                    viewStyle={{ alignSelf: 'flex-start' }}
                    onPress={() => {
                        confirmValue(undefined)
                    }}
                />
            </Animated.View>
        )
    }
    return (
        <View style={{ gap: 16 }}>
            {[
                {
                    title: t('onboarding.providers'),
                    items: templates.filter((item) => PROVIDER_NAMES.includes(item.name)),
                },
                {
                    title: t('onboarding.selfHosted'),
                    items: templates.filter((item) => item.name === 'Chat Completions'),
                },
                ...(showAll
                    ? [
                          {
                              title: t('onboarding.otherApis'),
                              items: templates.filter(
                                  (item) =>
                                      !PROVIDER_NAMES.includes(item.name) &&
                                      item.name !== 'Chat Completions'
                              ),
                          },
                      ]
                    : []),
            ].map((group) => (
                <View key={group.title} style={{ gap: 10 }}>
                    <TText color="400">{group.title}</TText>
                    {group.items.map((item) => (
                        <ListButton
                            key={item.name}
                            active={confirmedValue?.configName === item.name}
                            onPress={() => choose(item)}
                            style={{ padding: 16, alignItems: 'center', gap: 14 }}>
                            <Aicons
                                name={(item.ui.display?.icon ?? 'link') as AiconsGlyphName}
                                size={30}
                                color={color.text._400}
                            />
                            <TText size={16} style={{ flex: 1 }}>
                                {item.ui.display?.name ?? item.name}
                            </TText>
                            {confirmedValue?.configName === item.name ? (
                                <TText color="400">{t('onboarding.configured')}</TText>
                            ) : (
                                <AntDesign name="right" size={18} color={color.text._400} />
                            )}
                        </ListButton>
                    ))}
                </View>
            ))}
            {!showAll && (
                <ThemedButton
                    iconName="down"
                    iconSize={16}
                    variant="secondary"
                    label={t('onboarding.showAll')}
                    onPress={() => setShowAll(!showAll)}
                />
            )}
            <BottomSheet
                ref={sheet}
                onClose={() => setEditing(undefined)}
                sheetStyle={{ maxHeight: '85%', flex: 1 }}
                bodyContainerStyle={[{ paddingHorizontal: 16, paddingVertical: 16 }, { flex: 1 }]}>
                {editing && (
                    <ConnectionForm
                        key={editing.template.name}
                        template={editing.template}
                        initialValue={editing.value}
                        onSave={(value) => {
                            confirmValue(value)
                            sheet.current?.close()
                        }}
                    />
                )}
            </BottomSheet>
            <TText color="400">{t('onboarding.connectionLater')}</TText>
        </View>
    )
}
export default ConnectionSetup

const ConnectionForm = ({
    template,
    initialValue,
    onSave,
}: {
    template: APIConfiguration
    initialValue: ConnectionDraft
    onSave: (value: ConnectionDraft) => void
}) => {
    const { t } = useTranslation()
    const [value, setValue] = useState(initialValue)
    const patch = (changes: Partial<ConnectionDraft>) =>
        setValue((previous) => ({ ...previous, ...changes }))
    const { models, status, retry } = useConnectionModels(template, value.modelEndpoint, value.key)
    return (
        <>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                <TText size={22}>{template.ui.display?.name ?? template.name}</TText>
                {template.name === 'Chat Completions' && (
                    <TText color="400">{t('onboarding.selfHostedDescription')}</TText>
                )}
                <View style={{ gap: 12 }}>
                    <ThemedTextInput
                        label={t('connections.editor.friendlyName')}
                        value={value.friendlyName}
                        onChangeText={(friendlyName) => patch({ friendlyName })}
                    />
                    {template.ui.editableCompletionPath && (
                        <ThemedTextInput
                            label={t('connections.editor.completionUrl')}
                            value={value.endpoint}
                            placeholder={
                                template.name === 'Chat Completions'
                                    ? 'http://192.168.1.100:8080/v1/chat/completions'
                                    : undefined
                            }
                            onChangeText={(endpoint) =>
                                patch({
                                    endpoint,
                                    modelEndpoint: getModelEndpoint(value, endpoint),
                                })
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    )}
                    {template.features.useKey && (
                        <ThemedTextInput
                            label={t('connections.editor.apiKey')}
                            value={value.key}
                            onChangeText={(key) => patch({ key })}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    )}
                    {template.ui.editableModelPath && (
                        <ThemedTextInput
                            label={t('connections.editor.modelUrl')}
                            value={value.modelEndpoint}
                            onChangeText={(modelEndpoint) => patch({ modelEndpoint })}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    )}
                    {template.features.useModel && (
                        <>
                            <DropdownSheet
                                keyExtractor={(item) =>
                                    String(getNestedValue(item, template.model.nameParser))
                                }
                                data={models}
                                selected={
                                    template.features.multipleModels
                                        ? value.model?.[0]
                                        : value.model
                                }
                                labelExtractor={(item) =>
                                    String(getNestedValue(item, template.model.nameParser) ?? '')
                                }
                                onChangeValue={(model) =>
                                    patch({
                                        model: template.features.multipleModels ? [model] : model,
                                    })
                                }
                                search
                                placeholder={t('connections.editor.selectModel')}
                            />
                            <TText color="400">{t(`onboarding.models.${status}`)}</TText>
                            {status === 'failed' && (
                                <ThemedButton
                                    variant="tertiary"
                                    label={t('common.actions.tryAgain')}
                                    onPress={retry}
                                />
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            <ThemedButton
                variant="secondary"
                label={t('common.actions.save')}
                disabled={!isConnectionReady(value, template)}
                onPress={() => onSave(value)}
            />
        </>
    )
}

type ModelRequest = { template: APIConfiguration; endpoint: string; key: string; attempt: number }
const useConnectionModels = (template: APIConfiguration, endpoint: string, key: string) => {
    const [attempt, setAttempt] = useState(0)
    const request = useMemo(
        () => ({ template, endpoint, key, attempt }),
        [template, endpoint, key, attempt]
    )
    const [result, setResult] = useState<{
        request: ModelRequest
        models: unknown[]
        status: 'ready' | 'failed'
    }>()
    const enabled =
        template.features.useModel &&
        !!endpoint.trim() &&
        (!requiresConnectionKey(template) || !!key.trim())
    useEffect(() => {
        if (!enabled) return
        const controller = new AbortController()
        const timer = setTimeout(async () => {
            const headers: Record<string, string> = {}
            if (template.features.useKey && key)
                headers[template.request.authHeader] = template.request.authPrefix + key
            if (template.name === 'Claude') headers['anthropic-version'] = CLAUDE_VERSION
            try {
                const response = await fetch(endpoint, { headers, signal: controller.signal })
                if (!response.ok) throw new Error(String(response.status))
                const models = getNestedValue(await response.json(), template.model.modelListParser)
                if (!Array.isArray(models)) throw new Error()
                if (!controller.signal.aborted) setResult({ request, models, status: 'ready' })
            } catch {
                if (!controller.signal.aborted) setResult({ request, models: [], status: 'failed' })
            }
        }, 500)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [enabled, request, template, endpoint, key])
    const current = enabled && result?.request === request
    return {
        models: current ? result.models : [],
        // eslint-disable-next-line i18next/no-literal-string -- Status identifiers select translated messages.
        status: !enabled ? 'idle' : current ? result.status : 'loading',
        retry: () => setAttempt((previous) => previous + 1),
    }
}
