import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'

import ListButton, { ListButtonSection } from '@components/buttons/ListButton'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import BottomSheet, { useBottomSheetRef } from '@components/views/BottomSheet'
import ThemedSpinner from '@components/views/ThemedSpinner'
import type { ChatSummary } from '@db/schema'
import { isDeferredTaskActive, type DeferredTask } from '@lib/engine/generation/deferredState'
import { useDeferredTasks } from '@lib/engine/generation/hooks'
import { cancelDeferredTask } from '@lib/engine/generation/scheduler'
import { deleteSummary, generateSummary, saveSummary } from '@lib/engine/summaries/actions'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { contextHistory } from '@lib/queries/contextAllocation'
import { Logger } from '@lib/state/Logger'
import { summaryManagerList, summaryInputList } from '@lib/summaries/db'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { Theme } from '@lib/theme/ThemeManager'

const SummaryEditor = ({
    summary,
    task,
    enabled,
    select,
}: {
    summary: ChatSummary & { sourceCount: number; inputCount?: number }
    task?: DeferredTask
    enabled: boolean
    select: (id?: number) => void
}) => {
    const { t } = useTranslation()
    const [showSources, setShowSources] = useState(false)
    const archived = summary.status !== 'draft' && summary.status !== 'accepted'
    const { data: inputs } = useLiveQuerySync(summaryInputList(summary.id), {
        key: ['summary-inputs', summary.id],
        watch: [{ table: 'summary_inputs' }, { table: 'chat_summaries' }],
    })
    const [content, setContent] = useState(summary.content)
    const { data: history } = useLiveQuerySync(contextHistory(summary.chat_id), {
        key: ['summary-eligible-history', summary.chat_id],
        watch: [{ table: 'chat_entries' }, { table: 'chat_swipes' }],
    })
    const eligibleEnd = history
        .filter((message) => !message.is_user && message.has_content)
        .at(-2)?.id
    const canReplace =
        summary.status === 'draft' &&
        summary.kind !== 'consolidation' &&
        eligibleEnd !== undefined &&
        eligibleEnd > summary.end_entry_id
    const { color } = Theme.useTheme()
    const run = (action: () => unknown) => {
        try {
            action()
        } catch (error) {
            Logger.errorToast(t('summary.actionFailed'), error)
        }
    }
    const handleDelete = () =>
        Alert.alert({
            title: t('summary.deleteTitle'),
            description: t('summary.deleteConfirm'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('common.actions.delete'),
                    type: 'warning',
                    onPress: () =>
                        run(() => {
                            deleteSummary(summary.id)
                            select()
                        }),
                },
            ],
        })
    return (
        <View style={{ flex: 1, rowGap: 12 }}>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1, rowGap: 12 }}>
                <TText color="400">
                    {t(`summary.kind.${summary.kind}`)} · {t(`summary.status.${summary.status}`)} ·{' '}
                    {summary.kind === 'consolidation'
                        ? `${t('summary.inputCoverage', { count: summary.inputCount })} · `
                        : ''}
                    {t('summary.coverage', { count: summary.sourceCount })}
                </TText>
                {!!summary.error && (
                    <TText style={{ color: color.error._400 }}>{summary.error.message}</TText>
                )}
                {summary.source_changed && (
                    <TText style={{ color: color.warning._700 }}>
                        {t('summary.sourceChanged')}
                    </TText>
                )}
                {!!task && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
                        <ThemedSpinner />
                        <TText>
                            {t(
                                `summary.tasks.${task.status}.${summary.kind === 'consolidation' ? 'consolidation' : 'summary'}`
                            )}
                        </TText>
                        <ThemedButton
                            iconName="close"
                            variant="tertiary"
                            disabled={task.status === 'cancelling'}
                            accessibilityLabel={t('common.actions.cancel')}
                            onPress={() => cancelDeferredTask(task.id)}
                        />
                    </View>
                )}
                <ThemedTextInput
                    multiline
                    value={content}
                    onChangeText={setContent}
                    editable={!task && !archived}
                    containerStyle={{ flex: 1 }}
                    style={{
                        flex: 1,
                        minHeight: 180,
                        textAlignVertical: 'top',
                        borderColor: summary.source_changed
                            ? color.warning._500
                            : color.neutral._400,
                    }}
                />
                {summary.kind === 'consolidation' && (
                    <>
                        <ThemedButton
                            variant="tertiary"
                            label={t('summary.viewSources', { count: inputs.length })}
                            onPress={() => setShowSources(!showSources)}
                        />
                        {showSources &&
                            inputs.map((input) => (
                                <ListButton
                                    key={input.id}
                                    active={false}
                                    onPress={() => select(input.id)}
                                    style={{ padding: 12 }}>
                                    <TText numberOfLines={3}>{input.content}</TText>
                                </ListButton>
                            ))}
                    </>
                )}
            </ScrollView>
            {!!summary.error && (
                <TText color="400" size={12}>
                    {t('summary.compressionFallback')}
                </TText>
            )}
            {!archived && (
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}>
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <ThemedButton
                            label={t('common.actions.delete')}
                            variant="critical"
                            buttonStyle={{ paddingHorizontal: 8 }}
                            disabled={!!task}
                            onPress={handleDelete}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', columnGap: 4 }}>
                        <ThemedButton
                            iconName="reload"
                            iconSize={24}
                            variant="tertiary"
                            buttonStyle={{ padding: 4 }}
                            accessibilityLabel={t('summary.regenerate')}
                            disabled={!!task || !enabled}
                            onPress={() =>
                                run(() => {
                                    const next = generateSummary(summary.chat_id, {
                                        summaryId: summary.id,
                                    })
                                    if (next) select(next.summaryId)
                                })
                            }
                        />
                        {canReplace && (
                            <ThemedButton
                                iconName="double-right"
                                iconSize={24}
                                variant="tertiary"
                                buttonStyle={{ padding: 4 }}
                                accessibilityLabel={t('summary.replaceWithNewer')}
                                disabled={!!task || !enabled}
                                onPress={() =>
                                    run(() =>
                                        generateSummary(summary.chat_id, {
                                            summaryId: summary.id,
                                            supersedeDraft: true,
                                        })
                                    )
                                }
                            />
                        )}
                        {summary.status === 'draft' && (
                            <ThemedButton
                                iconName="forward"
                                iconSize={24}
                                variant="tertiary"
                                buttonStyle={{ padding: 4 }}
                                accessibilityLabel={t('summary.continue')}
                                disabled={!!task || !enabled || summary.source_changed}
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
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <ThemedButton
                            label={t('common.actions.save')}
                            buttonStyle={{ paddingHorizontal: 8 }}
                            disabled={!!task || !content.trim()}
                            onPress={() =>
                                run(() => {
                                    saveSummary(summary.id, content)
                                    select()
                                })
                            }
                        />
                    </View>
                </View>
            )}
        </View>
    )
}

const SummarySheet = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [showPrevious, setShowPrevious] = useState(false)
    const router = useRouter()
    const ref = useBottomSheetRef()
    const { chatId, summaryId, select, close } = useSummaryPanelState()
    useFocusEffect(useCallback(() => () => close(), [close]))
    const enabled = useSummarySettingsStore((state) => state.enabled)
    const { data: summaries } = useLiveQuerySync(summaryManagerList(chatId ?? -1), {
        key: ['summary-manager', chatId],
        watch: [
            { table: 'chat_summaries' },
            { table: 'summary_sources' },
            { table: 'summary_inputs' },
        ],
        enabled: chatId !== undefined,
    })
    const tasks = useDeferredTasks(chatId).filter(isDeferredTaskActive)
    const summary = summaries.find((item) => item.id === summaryId)
    const taskFor = (id?: number) =>
        tasks.find(
            (item) =>
                item.kind === 'summary' &&
                (item.resourceId === id ||
                    summaries
                        .find((summary) => summary.id === id)
                        ?.dependentIds.includes(item.resourceId ?? -1) ||
                    summaries.some(
                        (draft) => draft.id === item.resourceId && draft.replaces_id === id
                    ))
        )
    const task = taskFor(summaryId)
    const visible = summaries.filter((item) =>
        showPrevious
            ? item.status === 'replaced'
            : item.status === 'draft' || item.status === 'accepted'
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
        <BottomSheet ref={ref} onClose={close} sheetStyle={{ flex: 1, rowGap: 12 }}>
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
                    {!enabled && <TText>{t('summary.disabled')}</TText>}
                    {summaries.some((item) => item.status === 'draft' && !taskFor(item.id)) && (
                        <TText style={{ color: color.warning._700 }}>{t('summary.paused')}</TText>
                    )}
                    {summaries.some((item) => item.status === 'replaced') && (
                        <ThemedButton
                            variant="tertiary"
                            label={t(showPrevious ? 'summary.current' : 'summary.previous')}
                            onPress={() => setShowPrevious(!showPrevious)}
                        />
                    )}
                    {visible.length ? (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ rowGap: 8 }}>
                            {visible.map((item) => {
                                const busy = !!taskFor(item.id)
                                const active = item.status === 'accepted'
                                const needsReview =
                                    !busy && (item.source_changed || item.status === 'draft')
                                return (
                                    <ListButton
                                        key={item.id}
                                        active={active}
                                        warning={needsReview}
                                        style={{ paddingHorizontal: 12, columnGap: 20 }}
                                        onPress={() => select(item.id)}>
                                        <ListButtonSection style={{ flex: 1, paddingVertical: 12 }}>
                                            <View style={{ flex: 1, rowGap: 4 }}>
                                                <TText color={active ? '100' : '400'}>
                                                    {t(`summary.kind.${item.kind}`)} ·{' '}
                                                    {t(`summary.status.${item.status}`)}
                                                    {item.source_changed
                                                        ? ` · ${t('summary.changed')}`
                                                        : ''}
                                                </TText>
                                                <TText numberOfLines={3} color="400">
                                                    {item.content || t('summary.unfinished')}
                                                </TText>
                                            </View>
                                        </ListButtonSection>
                                        {busy && (
                                            <ListButtonSection>
                                                <ThemedSpinner />
                                            </ListButtonSection>
                                        )}
                                    </ListButton>
                                )
                            })}
                        </ScrollView>
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <TText color="400" style={{ textAlign: 'center' }}>
                                {t('summary.empty')}
                            </TText>
                        </View>
                    )}
                    <ThemedButton
                        label={t('summary.generate')}
                        iconName="plus"
                        variant="secondary"
                        disabled={
                            !enabled ||
                            summaries.some((item) => item.status === 'draft') ||
                            tasks.some((item) => item.kind === 'summary')
                        }
                        onPress={() => {
                            if (chatId !== undefined)
                                run(() => {
                                    const next = generateSummary(chatId)
                                    if (next) select(next.summaryId)
                                })
                        }}
                    />
                </>
            )}
        </BottomSheet>
    )
}
export default SummarySheet
