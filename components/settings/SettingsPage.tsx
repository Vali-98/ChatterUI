import type { ReactNode } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import HeaderTitle from '@components/views/HeaderTitle'

const SettingsPage = ({ title, children }: { title: string; children: ReactNode }) => (
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <HeaderTitle title={title} />
        <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, rowGap: 8, paddingBottom: 32 }}>
            {children}
        </KeyboardAwareScrollView>
    </SafeAreaView>
)

export default SettingsPage
