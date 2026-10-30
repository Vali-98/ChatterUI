import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import ListEditorSheet from '@components/input/ListEditorSheet'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import { db } from '@db/db'
import { tags as tagTable } from '@db/schema'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { AppSettings } from '@lib/constants/appSettings'
import { TagHider } from '@lib/state/TagHider'

const TagHiderSettings = () => {
    const { t } = useTranslation()
    const [tagHider, setUseTagHider] = useMMKVBoolean(AppSettings.UseTagHider)
    const { tags, setTags } = TagHider.useTagHiderStore(
        useShallow((store) => ({
            tags: store.tags,
            setTags: store.setTags,
        }))
    )

    const { data: availableTags } = useLiveQueryAsync(db.select().from(tagTable), {
        key: ['hidden-tag-suggestions'],
        watch: [{ table: 'tags' }],
    })

    return (
        <View>
            <ThemedSwitchRow
                label={t('settings.tagHider.label')}
                description={t('settings.tagHider.description')}
                value={tagHider}
                onChangeValue={(b) => setUseTagHider(b)}
            />
            {tagHider && (
                <ListEditorSheet
                    title={t('settings.tagHider.label')}
                    showLabel={false}
                    placeholder={t('character.editor.fields.tagsPlaceholder')}
                    value={tags}
                    onChangeValue={setTags}
                    suggestions={availableTags.map((item) => item.tag)}
                    keyExtractor={(item) => item}
                    labelExtractor={(item) => item}
                    createItem={(text) => {
                        const tag = text.trim()
                        if (!tag) throw new Error(t('listEditor.emptyValueError'))
                        return tag
                    }}
                    commitMode="confirm"
                />
            )}
        </View>
    )
}

export default TagHiderSettings
