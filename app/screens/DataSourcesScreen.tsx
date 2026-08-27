import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import LongButton from '@components/buttons/LongButton'
import TText from '@components/text/TText'
import HeaderTitle from '@components/views/HeaderTitle'

const DataSourcesScreen = () => {
    const router = useRouter()

    return (
        <SafeAreaView style={{ paddingHorizontal: 12 }}>
            <HeaderTitle title="Data Sources" />

            <LongButton onPress={() => router.push('/screens/LorebookManagerScreen')}>
                <TText size={18} style={{ paddingLeft: 12 }}>
                    Lorebooks
                </TText>
            </LongButton>
        </SafeAreaView>
    )
}

export default DataSourcesScreen
