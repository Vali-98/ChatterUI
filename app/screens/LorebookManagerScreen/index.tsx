import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import ListButton from '@components/buttons/ListButton'
import { ListCardSection } from '@components/views/ListCard'
import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { LorebookType } from '@db/schema'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Lorebooks } from '@lib/state/lorebooks'
import { Theme } from '@lib/theme/ThemeManager'

import { useLorebookInfoState } from './LorebookInfo'
import LorebookPreferenceEditor from './LorebookPreferenceEditor'

const LorebookManagerHeaderButtons = () => {
    const { t } = useTranslation()
    const createLorebookInputRef = useBottomSheetRef()
    return (
        <>
            <InputSheet
                title={t('lorebook.new.title')}
                placeholder={t('lorebook.new.placeholder')}
                ref={createLorebookInputRef}
                onConfirm={(name) => {
                    if (name === '') name = t('lorebook.new.placeholder')
                    Lorebooks.db.mutate.createLorebook(name)
                }}
            />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu>
                        <ContextMenu.Trigger icon="setting" />
                        <ContextMenu.Body>
                            <ContextMenu.Button
                                label={t('lorebook.import')}
                                icon="import"
                                onPress={() => {
                                    Lorebooks.importFromJSON()
                                }}
                            />
                            <ContextMenu.Button
                                label={t('common.actions.create')}
                                icon="edit"
                                onPress={() => {
                                    createLorebookInputRef.current?.open()
                                }}
                            />
                        </ContextMenu.Body>
                    </ContextMenu>
                )}
            />
        </>
    )
}

const LorebookListItem: React.FC<{ lorebook: LorebookType }> = ({ lorebook }) => {
    const { t } = useTranslation()
    const { setId } = useLorebookInfoState()
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
        <ListButton
            style={{ paddingHorizontal: 12 }}
            active={lorebook.active ?? false}
            onPress={() => {
                setId(lorebook.id)
                router.push('/screens/LorebookManagerScreen/LorebookInfo')
            }}>
            <ListCardSection style={{ columnGap: 12 }}>
                <ThemedSwitch
                    value={lorebook?.active || false}
                    onChangeValue={(active) =>
                        Lorebooks.db.mutate.updateLorebookInfo(lorebook.id, {
                            active,
                        })
                    }
                />
                <TText
                    color={lorebook.active ? '100' : '400'}
                    size={16}
                    style={{ flexShrink: 1, paddingVertical: 12 }}>
                    {lorebook.name}
                </TText>
            </ListCardSection>
            <ListCardSection>
                <ContextMenu>
                    <ContextMenu.Trigger iconStyle={{ paddingVertical: 12 }} icon="edit" />
                    <ContextMenu.Body>
                        <ContextMenu.Button
                            label={t('common.actions.delete')}
                            variant="warning"
                            icon="delete"
                            onPress={() => {
                                handleDeleteLorebook(lorebook.id, lorebook.name)
                            }}
                        />
                        <ContextMenu.Button
                            label={t('common.actions.export')}
                            icon="export"
                            onPress={() => {
                                Lorebooks.exportToJSON(lorebook.id)
                            }}
                        />
                    </ContextMenu.Body>
                </ContextMenu>
            </ListCardSection>
        </ListButton>
    )
}

const LorebookEmpty = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    return (
        <View
            style={{
                flex: 1,
                padding: 64,
                alignItems: 'center',
                rowGap: 12,
            }}>
            <AntDesign name="file-search" size={64} style={{ color: color.text._600 }} />
            <Text style={{ color: color.text._600 }}>{t('lorebook.empty')}</Text>
        </View>
    )
}

const LorebookManagerScreen = () => {
    const { data: lorebooks } = useLiveQueryAsync(Lorebooks.db.live.lorebookList(), {
        key: ['lorebook-list'],
        watch: [{ table: 'lorebooks' }],
    })
    const { t } = useTranslation()

    return (
        <SafeAreaView style={{ paddingHorizontal: 12, rowGap: 8 }}>
            <HeaderTitle title={t('lorebook.title')} />
            <LorebookManagerHeaderButtons />
            <LorebookPreferenceEditor />

            <SectionTitle>{t('lorebook.title')}</SectionTitle>

            <FlatList
                style={{ marginTop: 8 }}
                data={lorebooks}
                contentContainerStyle={{ rowGap: 12 }}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item: lorebook }) => <LorebookListItem lorebook={lorebook} />}
                ListEmptyComponent={<LorebookEmpty />}
            />
        </SafeAreaView>
    )
}

export default LorebookManagerScreen
