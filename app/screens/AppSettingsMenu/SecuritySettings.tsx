import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const SecuritySettings = () => {
    const [authLocal, setAuthLocal] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Security</SectionTitle>
            <ThemedSwitch
                label="Lock App"
                value={authLocal}
                onChangeValue={setAuthLocal}
                description="Requires user authentication to open the app. This will not work if you have no device locks enabled."
            />
        </View>
    )
}

export default SecuritySettings
