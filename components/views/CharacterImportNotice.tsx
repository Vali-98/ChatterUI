import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useCharacterImportState } from '@lib/state/characters/importState'

import Notice from './Notice'
import NoticeProgress from './NoticeProgress'

const CharacterImportNotice = () => {
    const { t } = useTranslation()
    const { isImporting, total, completed, succeeded, failed, noticeDismissed, dismissNotice } =
        useCharacterImportState()
    useEffect(() => {
        if (isImporting || !total || noticeDismissed) return
        const timer = setTimeout(dismissNotice, 5000)
        return () => clearTimeout(timer)
    }, [isImporting, total, noticeDismissed, dismissNotice])
    if (!total || noticeDismissed) return null
    if (isImporting)
        return (
            <NoticeProgress
                label={t('character.import.progress', { completed, total })}
                progress={(completed / total) * 100}
                showPercentage={false}
                iconName="upload"
            />
        )
    return (
        <Notice
            label={t(failed ? 'character.import.resultWithFailures' : 'character.import.result', {
                succeeded,
                failed,
            })}
            variant={failed ? (succeeded ? 'warning' : 'error') : 'neutral'}
        />
    )
}

export default CharacterImportNotice
