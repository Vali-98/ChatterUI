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
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { Lorebooks } from '@lib/state/lorebooks'
import { Theme } from '@lib/theme/ThemeManager'

import { useLorebookInfoState } from './LorebookInfo'
import LorebookPreferenceEditor from './LorebookPreferenceEditor'

const LorebookManagerScreen = () => {
    const { data: lorebooks } = useLiveQuery(Lorebooks.db.live.lorebookList())
    const { color } = Theme.useTheme()
    const { setId } = useLorebookInfoState()
    const { t } = useTranslation()
    const createLorebookInputRef = useBottomSheetRef()
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
                            {
                                label: t('common.actions.create'),
                                icon: 'edit',
                                onPress: (close) => {
                                    createLorebookInputRef.current?.open()
                                    close()
                                },
                            },
                        ]}
                    />
                )}
            />
            <LorebookPreferenceEditor />
            <SectionTitle>{t('lorebook.title')}</SectionTitle>

            <InputSheet
                title={t('lorebook.new.title')}
                placeholder={t('lorebook.new.placeholder')}
                ref={createLorebookInputRef}
                onConfirm={(name) => {
                    if (name === '') name = t('lorebook.new.placeholder')
                    Lorebooks.db.mutate.createLorebook(name)
                }}
            />
            <FlatList
                style={{ marginTop: 8 }}
                data={lorebooks}
                contentContainerStyle={{ rowGap: 12 }}
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
                                {
                                    label: t('common.actions.export'),
                                    icon: 'export',
                                    onPress: (close) => {
                                        Lorebooks.exportToJSON(item.id)
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
