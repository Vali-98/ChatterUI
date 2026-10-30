import { useTranslation } from 'react-i18next'

import { useLocalModelResourceState } from '@lib/engine/generation/localResource'

import Notice, { NoticeAction } from './Notice'
import NoticeProgress from './NoticeProgress'

const ModelOperationNotice = () => {
    const { t } = useTranslation()
    const activity = useLocalModelResourceState((state) => state.activity)
    const dismissNotice = useLocalModelResourceState((state) => state.dismissNotice)
    if (!activity) return null
    if (activity.error !== undefined)
        return (
            <Notice
                label={t('model.notice.failed', { error: activity.error })}
                variant="error"
                actions={<NoticeAction label={t('common.actions.close')} onPress={dismissNotice} />}
            />
        )
    return (
        <NoticeProgress
            label={t(`model.notice.${activity.kind}`, { name: activity.name })}
            progress={activity.progress}
        />
    )
}

export default ModelOperationNotice
