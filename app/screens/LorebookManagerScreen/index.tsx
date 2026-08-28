import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import LongButton from '@components/buttons/LongButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Lorebooks } from '@lib/state/lorebooks'
import { Theme } from '@lib/theme/ThemeManager'

import { useLorebookInfoState } from './LorebookInfo'
import LorebookPreferenceEditor from './LorebookPreferenceEditor'

const LorebookManagerScreen = () => {
    const { data: lorebooks } = useLiveQuery(Lorebooks.db.live.lorebookList())
    const { color } = Theme.useTheme()
    const { setId } = useLorebookInfoState()
    const { t } = useTranslation()
    const router = useRouter()

    const handleDeleteLorebook = (id: number, name: string) => {
        Alert.alert({
            title: t('lorebook.delete.title'),
            description: t('lorebook.delete.description', {
                name: name,
            }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('common.actions.delete'),
                    onPress: () => {
                        Lorebooks.db.mutate.deleteLorebook(id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <SafeAreaView style={{ paddingHorizontal: 12, rowGap: 8 }}>
            <HeaderTitle title={t('lorebook.title')} />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu
                        triggerIcon="setting"
                        buttons={[
                            {
                                label: t('lorebook.import'),
                                icon: 'import',
                                onPress: (close) => {
                                    Lorebooks.importFromJSON()
                                    close()
                                },
                            },
                        ]}
                    />
                )}
            />
            <LorebookPreferenceEditor />
            <SectionTitle>{t('lorebook.title')}</SectionTitle>
            <FlatList
                style={{ marginTop: 8 }}
                data={lorebooks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <LongButton
                        active={item.active ?? false}
                        style={{ flexDirection: 'row', columnGap: 12, alignItems: 'center' }}
                        onPress={() => {
                            setId(item.id)
                            router.push('/screens/LorebookManagerScreen/LorebookInfo')
                        }}>
                        <ThemedSwitch
                            value={item?.active || false}
                            onChangeValue={(active) =>
                                Lorebooks.db.mutate.updateLorebookInfo(item.id, {
                                    active,
                                })
                            }
                        />

                        <TText color={item.active ? '100' : '400'} style={{ flex: 1 }} size={16}>
                            {item.name}
                        </TText>

                        <ContextMenu
                            triggerIcon="edit"
                            buttons={[
                                {
                                    label: t('common.actions.delete'),
                                    variant: 'warning',
                                    icon: 'delete',
                                    onPress: (close) => {
                                        handleDeleteLorebook(item.id, item.name)
                                        close()
                                    },
                                },
                            ]}
                        />
                    </LongButton>
                )}
                ListEmptyComponent={
                    <View
                        style={{
                            flex: 1,
                            padding: 64,
                            alignItems: 'center',
                            rowGap: 12,
                        }}>
                        <AntDesign
                            name="file-search"
                            size={64}
                            style={{ color: color.text._600 }}
                        />
                        <Text style={{ color: color.text._600 }}>{t('lorebook.empty')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    )
}

export default LorebookManagerScreen
