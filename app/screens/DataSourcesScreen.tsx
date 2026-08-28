import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

import LongButton from '@components/buttons/LongButton'
import TText from '@components/text/TText'
import HeaderTitle from '@components/views/HeaderTitle'

const DataSourcesScreen = () => {
    const router = useRouter()
    const { t } = useTranslation()
    return (
        <SafeAreaView style={{ paddingHorizontal: 12 }}>
            <HeaderTitle title={t('navigation.dataSources')} />

            <LongButton onPress={() => router.push('/screens/LorebookManagerScreen')}>
                <TText size={18} style={{ paddingLeft: 12 }}>
                    {t('lorebook.title')}
                </TText>
            </LongButton>
        </SafeAreaView>
    )
}

export default DataSourcesScreen
