import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { ChatControlColumn, ChatControlPanel } from '@components/views/ChatControlColumn'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { isDeferredTaskActive } from '@lib/engine/generation/deferredState'
import { useDeferredTasks } from '@lib/engine/generation/hooks'
import { cancelDeferredTask } from '@lib/engine/generation/scheduler'
import { dismissSummaryNotice } from '@lib/engine/summaries/actions'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { summaryList } from '@lib/summaries/db'
import { useSummaryPanelState } from '@lib/summaries/panelState'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { Theme } from '@lib/theme/ThemeManager'

const ChatNoticeStack = ({ chatId }: { chatId: number }) => {
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
    const hidden = unresolved.length - Math.min(notices.length, 3)
    return (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: 12, right: 12, maxWidth: '95%', zIndex: 150 }}>
            <ChatControlColumn>
                {tasks.map((task) => (
                    <ChatControlPanel key={`task-${task.id}`} style={{ columnGap: 8 }}>
                        <ThemedSpinner />
                        <TText numberOfLines={1}>
                            {t(`summary.tasks.${task.status}.${task.kind}`)}
                        </TText>
                        <ThemedButton
                            iconName="close"
                            iconSize={16}
                            variant="tertiary"
                            disabled={task.status === 'cancelling'}
                            accessibilityLabel={t('common.actions.cancel')}
                            iconStyle={{ color: color.error._400 }}
                            onPress={() => cancelDeferredTask(task.id)}
                        />
                    </ChatControlPanel>
                ))}
                {notices.slice(0, 3).map((summary) => (
                    <Pressable
                        key={summary.id}
                        onPress={() => open(chatId, summary.id)}
                        accessibilityRole="button">
                        <ChatControlPanel style={{ columnGap: 8, borderColor: color.warning }}>
                            <TText numberOfLines={1}>
                                {t(
                                    summary.status === 'draft'
                                        ? 'summary.unfinished'
                                        : 'summary.changed'
                                )}
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
                        </ChatControlPanel>
                    </Pressable>
                ))}
                {hidden > 0 && (
                    <ThemedButton
                        iconName="file-text"
                        label={String(hidden)}
                        iconSize={14}
                        variant="secondary"
                        buttonStyle={{
                            backgroundColor: color.neutral._100,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                        }}
                        accessibilityLabel={t('summary.title')}
                        onPress={() => open(chatId)}
                    />
                )}
            </ChatControlColumn>
        </View>
    )
}
export default ChatNoticeStack
