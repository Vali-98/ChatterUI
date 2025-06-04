import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { TagHider } from '@lib/state/TagHider'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

const TagHiderSettings = () => {
    const [tagHider, setUseTagHider] = useMMKVBoolean(AppSettings.UseTagHider)
    const { tags, setTags } = TagHider.store(
        useShallow((store) => ({
            tags: store.tags,
            setTags: store.setTags,
        }))
    )

    return (
        <View style={{ marginBottom: 4 }}>
            <SectionTitle>Hide Tags</SectionTitle>
            <ThemedSwitch
                label="Enable"
                description="Hide characters with the following tags from the character list."
                value={tagHider}
                onChangeValue={(b) => setUseTagHider(b)}
            />
            <StringArrayEditor value={tags} setValue={(data) => setTags(data)} />
        </View>
    )
}

export default TagHiderSettings
