import { useTranslation } from 'react-i18next'

import Notice, { CollapsedNotice, NoticeAction } from '@components/views/Notice'
import NoticeProgress from '@components/views/NoticeProgress'
import { isDeferredTaskActive } from '@lib/engine/generation/deferredState'
import { useDeferredTasks } from '@lib/engine/generation/hooks'
import { cancelDeferredTask } from '@lib/engine/generation/scheduler'
import { dismissSummaryNotice, restoreSummaryNotice } from '@lib/engine/summaries/actions'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { summaryList } from '@lib/summaries/db'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'

const ChatNotices = ({ chatId }: { chatId: number }) => {
    const { t } = useTranslation()
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
                <NoticeProgress
                    key={`task-${task.id}`}
                    variant="neutral"
                    label={t(
                        `summary.tasks.${task.status}.${task.kind === 'summary' && summaries.find((summary) => summary.id === task.resourceId)?.kind === 'consolidation' ? 'consolidation' : task.kind}`
                    )}
                    actions={
                        <NoticeAction
                            label={t('common.actions.cancel')}
                            disabled={task.status === 'cancelling'}
                            accessibilityLabel={t('common.actions.cancel')}
                            onPress={() => cancelDeferredTask(task.id)}
                        />
                    }
                />
            ))}
            {notices.map((summary) => (
                <Notice
                    key={summary.id}
                    label={t(summary.status === 'draft' ? 'summary.unfinished' : 'summary.changed')}
                    onPress={() => open(chatId, summary.id)}
                    variant={summary.error?.reason === 'failed' ? 'error' : 'warning'}
                    actions={
                        <NoticeAction
                            label={t('summary.later')}
                            onPress={() => dismissSummaryNotice(summary.id)}
                        />
                    }
                />
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
