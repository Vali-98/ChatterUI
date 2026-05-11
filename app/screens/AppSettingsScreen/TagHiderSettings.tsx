import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedSwitch from '@components/input/ThemedSwitch'
import { AppSettings } from '@lib/constants/GlobalValues'
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

    return (
        <View>
            <ThemedSwitch
                label={t('settings.tagHider.label')}
                description={t('settings.tagHider.description')}
                value={tagHider}
                onChangeValue={(b) => setUseTagHider(b)}
            />
            <StringArrayEditor value={tags} setValue={(data) => setTags(data)} />
        </View>
    )
}

export default TagHiderSettings
