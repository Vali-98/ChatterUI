import { useTranslation } from 'react-i18next'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import Notice, { CollapsedNotice } from '@components/views/Notice'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { isDeferredTaskActive } from '@lib/engine/generation/deferredState'
import { useDeferredTasks } from '@lib/engine/generation/hooks'
import { cancelDeferredTask } from '@lib/engine/generation/scheduler'
import { dismissSummaryNotice, restoreSummaryNotice } from '@lib/engine/summaries/actions'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { summaryList } from '@lib/summaries/db'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { Theme } from '@lib/theme/ThemeManager'

const ChatNotices = ({ chatId }: { chatId: number }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const open = useSummaryPanelState((state) => state.open)
    const warn = useSummarySettingsStore((state) => state.warnOnSourceChanges)
    const { data: summaries } = useLiveQuerySync(summaryList(chatId), {
        key: ['summary-notices', chatId],
        watch: [{ table: 'chat_summaries' }],
    })
    const tasks = useDeferredTasks(chatId).filter(isDeferredTaskActive)
    const unresolved = summaries.filter(
        (summary) =>
            (summary.status === 'draft' ||
                (warn && summary.status === 'accepted' && summary.source_changed)) &&
            !tasks.some(
                (task) =>
                    task.kind === 'summary' &&
                    (task.resourceId === summary.id ||
                        summaries.some(
                            (draft) =>
                                draft.id === task.resourceId && draft.replaces_id === summary.id
                        ))
            )
    )
    const notices = unresolved.filter((summary) => !summary.notice_dismissed)
    const hidden = unresolved.filter((summary) => summary.notice_dismissed)
    return (
        <>
            {tasks.map((task) => (
                <Notice key={`task-${task.id}`} variant="neutral" style={{ columnGap: 8 }}>
                    <ThemedSpinner />
                    <TText numberOfLines={1}>
                        {t(
                            `summary.tasks.${task.status}.${task.kind === 'summary' && summaries.find((summary) => summary.id === task.resourceId)?.kind === 'consolidation' ? 'consolidation' : task.kind}`
                        )}
                    </TText>
                    <IconButton
                        iconName="close"
                        iconSize={16}
                        variant="tertiary"
                        disabled={task.status === 'cancelling'}
                        accessibilityLabel={t('common.actions.cancel')}
                        level="error"
                        onPress={() => cancelDeferredTask(task.id)}
                    />
                </Notice>
            ))}
            {notices.map((summary) => (
                <Notice
                    key={summary.id}
                    onPress={() => open(chatId, summary.id)}
                    variant={summary.error?.reason === 'failed' ? 'error' : 'warning'}
                    style={{ columnGap: 8 }}>
                    <TText numberOfLines={1}>
                        {t(summary.status === 'draft' ? 'summary.unfinished' : 'summary.changed')}
                    </TText>
                    <TText color="400">·</TText>
                    <ThemedButton
                        label={t('summary.later')}
                        labelStyle={{ color: color.text._400 }}
                        variant="tertiary"
                        onPress={(event) => {
                            event.stopPropagation()
                            dismissSummaryNotice(summary.id)
                        }}
                    />
                </Notice>
            ))}
            {hidden.length > 0 && (
                <CollapsedNotice
                    iconName="file-text"
                    count={hidden.length}
                    variant={
                        hidden.some((summary) => summary.error?.reason === 'failed')
                            ? 'error'
                            : 'warning'
                    }
                    accessibilityLabel={t('summary.title')}
                    onPress={() => hidden.forEach((summary) => restoreSummaryNotice(summary.id))}
                />
            )}
        </>
    )
}
export default ChatNotices
