import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const GeneratingSettings = () => {
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [bypassContextLength, setBypassContextLength] = useMMKVBoolean(
        AppSettings.BypassContextLength
    )
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Generation</SectionTitle>

            <ThemedSwitch
                label="Print Context"
                value={printContext}
                onChangeValue={setPrintContext}
                description="Prints the generation context to logs for debugging"
            />

            <ThemedSwitch
                label="Bypass Context Length"
                value={bypassContextLength}
                onChangeValue={setBypassContextLength}
                description="Ignores context length limits when building prompts"
            />
        </View>
    )
}

export default GeneratingSettings
