import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import BottomSheet, { useBottomSheetRef } from '@components/views/BottomSheet'
import ThemedSpinner from '@components/views/ThemedSpinner'
import type { ChatSummary } from '@db/schema'
import { isDeferredTaskActive, type DeferredTask } from '@lib/engine/generation/deferredState'
import { useDeferredTasks } from '@lib/engine/generation/hooks'
import { cancelDeferredTask } from '@lib/engine/generation/scheduler'
import {
    discardSummary,
    generateSummary,
    keepSummary,
    setSummaryEnabled,
} from '@lib/engine/summaries/actions'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { Logger } from '@lib/state/Logger'
import { summaryManagerList } from '@lib/summaries/db'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { Theme } from '@lib/theme/ThemeManager'

const SummaryEditor = ({
    summary,
    task,
    enabled,
    select,
}: {
    summary: ChatSummary & { sourceCount: number }
    task?: DeferredTask
    enabled: boolean
    select: (id?: number) => void
}) => {
    const { t } = useTranslation()
    const [content, setContent] = useState(summary.content)
    const { color } = Theme.useTheme()
    const run = (action: () => unknown) => {
        try {
            action()
        } catch (error) {
            Logger.errorToast(t('summary.actionFailed'), error)
        }
    }
    return (
        <>
            <TText color="400">
                {t(`summary.status.${summary.status}`)} · {summary.start_entry_id}–
                {summary.end_entry_id}
            </TText>
            {!!summary.error && <TText style={{ color: color.error._400 }}>{summary.error}</TText>}
            {summary.source_changed && (
                <TText style={{ color: color.error._400 }}>{t('summary.sourceChanged')}</TText>
            )}
            {task ? (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        columnGap: 8,
                    }}>
                    <ThemedSpinner />
                    <TText>{t(`summary.tasks.${task.status}.summary`)}</TText>
                    <ThemedButton
                        iconName="close"
                        variant="tertiary"
                        onPress={() => cancelDeferredTask(task.id)}
                    />
                </View>
            ) : null}
            <ThemedTextInput
                multiline
                value={content}
                onChangeText={setContent}
                editable={!task}
                containerStyle={{ flex: 0 }}
            />
            {summary.status === 'accepted' && (
                <ThemedSwitch
                    label={t('summary.useInContext')}
                    disabled={!!task}
                    value={summary.enabled}
                    onChangeValue={(enabled) => {
                        if (!task) run(() => setSummaryEnabled(summary.id, enabled))
                    }}
                />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {summary.status === 'draft' && (
                    <ThemedButton
                        label={t('summary.continue')}
                        disabled={!!task || !enabled || summary.source_changed || !content.trim()}
                        onPress={() =>
                            run(() =>
                                generateSummary(summary.chat_id, {
                                    summaryId: summary.id,
                                    continueDraft: true,
                                    draftContent: content,
                                })
                            )
                        }
                    />
                )}
                <ThemedButton
                    label={t('summary.save')}
                    disabled={!!task || !content.trim()}
                    onPress={() =>
                        run(() => {
                            keepSummary(summary.id, content)
                            select()
                        })
                    }
                />
                {summary.status === 'accepted' && summary.source_changed && (
                    <ThemedButton
                        label={t('summary.keep')}
                        variant="secondary"
                        disabled={!!task}
                        onPress={() =>
                            run(() => {
                                keepSummary(summary.id)
                                select()
                            })
                        }
                    />
                )}
                <ThemedButton
                    label={t('summary.regenerate')}
                    variant="secondary"
                    disabled={!!task || !enabled}
                    onPress={() =>
                        run(() => {
                            const task = generateSummary(summary.chat_id, {
                                summaryId: summary.id,
                            })
                            if (task) select(task.summaryId)
                        })
                    }
                />
                {summary.status === 'draft' && (
                    <ThemedButton
                        label={t('summary.discard')}
                        variant="critical"
                        disabled={!!task}
                        onPress={() =>
                            Alert.alert({
                                title: t('summary.discard'),
                                description: t('summary.discardConfirm'),
                                buttons: [
                                    { label: t('common.actions.cancel') },
                                    {
                                        label: t('summary.discard'),
                                        type: 'warning',
                                        onPress: () =>
                                            run(() => {
                                                discardSummary(summary.id)
                                                select()
                                            }),
                                    },
                                ],
                            })
                        }
                    />
                )}
            </View>
        </>
    )
}

const SummarySheet = () => {
    const { t } = useTranslation()
    const router = useRouter()
    const { color } = Theme.useTheme()
    const ref = useBottomSheetRef()
    const { chatId, summaryId, select, close } = useSummaryPanelState()
    useFocusEffect(useCallback(() => () => close(), [close]))
    const enabled = useSummarySettingsStore((state) => state.enabled)
    const { data: summaries } = useLiveQuerySync(summaryManagerList(chatId ?? -1), {
        key: ['summary-manager', chatId],
        watch: [{ table: 'chat_summaries' }, { table: 'summary_sources' }],
        enabled: chatId !== undefined,
    })
    const tasks = useDeferredTasks(chatId).filter(isDeferredTaskActive)
    const summary = summaries.find((item) => item.id === summaryId)
    const task = tasks.find(
        (item) =>
            item.kind === 'summary' &&
            (item.resourceId === summaryId ||
                summaries.some(
                    (draft) => draft.id === item.resourceId && draft.replaces_id === summaryId
                ))
    )
    useEffect(() => {
        if (chatId !== undefined) ref.current?.open()
        else ref.current?.close()
    }, [chatId, ref])
    const run = (action: () => unknown) => {
        try {
            action()
        } catch (error) {
            Logger.errorToast(t('summary.actionFailed'), error)
        }
    }
    return (
        <BottomSheet ref={ref} onClose={close} sheetStyle={{ maxHeight: '90%', rowGap: 12 }}>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                <ThemedButton
                    label={t('summary.title')}
                    iconName={summary ? 'arrow-left' : 'file-text'}
                    variant="tertiary"
                    onPress={() => select()}
                />
                <ThemedButton
                    iconName="setting"
                    variant="tertiary"
                    accessibilityLabel={t('summary.settings')}
                    onPress={() => {
                        close()
                        router.push('/screens/SummarySettingsScreen')
                    }}
                />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ rowGap: 12 }}>
                {summary ? (
                    <SummaryEditor
                        key={`${summary.id}:${summary.content}`}
                        summary={summary}
                        task={task}
                        enabled={enabled}
                        select={select}
                    />
                ) : (
                    <>
                        <ThemedButton
                            label={t('summary.generate')}
                            disabled={
                                !enabled ||
                                summaries.some((item) => item.status === 'draft') ||
                                tasks.some((task) => task.kind === 'summary')
                            }
                            onPress={() =>
                                chatId !== undefined &&
                                run(() => {
                                    const task = generateSummary(chatId)
                                    if (task) select(task.summaryId)
                                })
                            }
                        />
                        {!enabled && <TText>{t('summary.disabled')}</TText>}
                        {summaries.some((item) => item.status === 'draft') && (
                            <TText color="400">{t('summary.paused')}</TText>
                        )}
                        {summaries
                            .filter((item) => item.status !== 'discarded')
                            .map((item) => (
                                <Pressable
                                    key={item.id}
                                    onPress={() => select(item.id)}
                                    style={{
                                        padding: 12,
                                        borderWidth: 1,
                                        borderColor: color.neutral._300,
                                        borderRadius: 8,
                                        rowGap: 4,
                                    }}>
                                    <TText>
                                        {t(`summary.status.${item.status}`)}
                                        {item.source_changed ? ` · ${t('summary.changed')}` : ''}
                                        {!item.enabled ? ` · ${t('summary.inactive')}` : ''}
                                    </TText>
                                    <TText numberOfLines={2} color="400">
                                        {item.content || t('summary.unfinished')}
                                    </TText>
                                </Pressable>
                            ))}
                    </>
                )}
            </ScrollView>
        </BottomSheet>
    )
}
export default SummarySheet
