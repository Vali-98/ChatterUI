import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const ScreenSettings = () => {
    const [unlockOrientation, setUnlockOrientation] = useMMKVBoolean(AppSettings.UnlockOrientation)
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Screen</SectionTitle>
            <ThemedSwitch
                label="Unlock Orientation"
                value={unlockOrientation}
                onChangeValue={setUnlockOrientation}
                description="Allows landscape on phones (App restart required)"
            />
        </View>
    )
}

export default ScreenSettings
