import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import LongButton from '@components/buttons/LongButton'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Lorebooks } from '@lib/state/lorebooks'

import { useLorebookInfoState } from './LorebookInfo'

const LorebookManagerScreen = () => {
    const { data: lorebooks } = useLiveQuery(Lorebooks.db.live.lorebookList())
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
            <HeaderButton
                headerRight={() => (
                    <ContextMenu
                        triggerIcon="setting"
                        buttons={[
                            {
                                label: 'Import Lorebook',
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
            <HeaderTitle title={'Lorebooks'} />
            <FlatList
                data={lorebooks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <LongButton
                        onPress={() => {
                            setId(item.id)
                            router.push('/screens/LorebookManagerScreen/LorebookInfo')
                        }}>
                        <View style={{ flexDirection: 'row', columnGap: 12, alignItems: 'center' }}>
                            <ThemedSwitch
                                value={item?.active || false}
                                onChangeValue={(active) =>
                                    Lorebooks.db.mutate.updateLorebookInfo(item.id, {
                                        active,
                                    })
                                }
                            />

                            <TText size={16}>{item.name}</TText>
                        </View>
                        <ContextMenu
                            triggerIcon="edit"
                            buttons={[
                                {
                                    label: 'Delete',
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
            />
        </SafeAreaView>
    )
}

export default LorebookManagerScreen
