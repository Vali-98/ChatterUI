import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import ListSheet from '@components/input/ListSheet'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import HeaderTitle from '@components/views/HeaderTitle'
import { LinkType } from '@db/schema'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { CharacterLink } from '@lib/state/CharacterLinks'
import { Characters } from '@lib/state/Characters'
import { Instructs } from '@lib/state/Instructs'
import { SamplersManager } from '@lib/state/SamplerState'
import { Theme } from '@lib/theme/ThemeManager'

type Link = { value: number; label: string }

type LinkCollection = {
    options: Link[]
    active: (Link & { id: number }) | undefined
    type: LinkType
}

const useActiveCharacterLinks = (charId: number): LinkCollection[] => {
    // db lists
    const { data } = useLiveQueryJoined(CharacterLink.db.live.links(charId), [], {
        sync: true,
    })

    const userList = useLiveQueryJoined(Characters.db.live.listSimple('user'), [], { sync: true })
    const instructList = useLiveQueryJoined(Instructs.db.query.instructListQuery(), [], {
        sync: true,
    })
    const samplerList = SamplersManager.useSamplerStore((state) => state.configList)
    const connectionsList = APIManager.useConnectionsStore((state) => state.values)

    // derived active values
    const userLink = data.find((link) => link.type === 'user_id')
    const activeUser = userList.data.find((user) => user.id === userLink?.value)

    const instructLink = data.find((link) => link.type === 'instruct_id')
    const activeInstruct = instructList.data.find((instruct) => instruct.id === instructLink?.value)

    const samplerLink = data.find((link) => link.type === 'sampler_index')
    const samplerIndex = samplerLink?.value
    const activeSampler = samplerIndex !== undefined ? samplerList?.[samplerIndex] : undefined

    const connectionLink = data.find((link) => link.type === 'connection_index')
    const connectionIndex = connectionLink?.value
    const activeConnection =
        connectionIndex !== undefined ? connectionsList?.[connectionIndex] : undefined

    return [
        {
            options: userList.data.map((item) => ({ label: item.name, value: item.id })),
            active:
                activeUser && userLink
                    ? { label: activeUser.name, value: activeUser.id, id: userLink.id }
                    : undefined,
            type: 'user_id',
        },
        {
            options: instructList.data.map((item) => ({ label: item.name, value: item.id })),
            active:
                activeInstruct && instructLink
                    ? { label: activeInstruct.name, value: activeInstruct.id, id: instructLink.id }
                    : undefined,
            type: 'instruct_id',
        },
        {
            options: samplerList.map((item, index) => ({ label: item.name, value: index })),
            active:
                activeSampler && samplerIndex !== undefined && samplerLink
                    ? { label: activeSampler.name, value: samplerIndex, id: samplerLink.id }
                    : undefined,
            type: 'sampler_index',
        },
        {
            options: connectionsList.map((item, index) => ({
                label: item.friendlyName,
                value: index,
            })),
            active:
                activeConnection && connectionIndex !== undefined && connectionLink
                    ? {
                          label: activeConnection.friendlyName,
                          value: connectionIndex,
                          id: connectionLink.id,
                      }
                    : undefined,
            type: 'connection_index',
        },
    ]
}

const CharacterLinkItem: React.FC<{
    linkCollection: LinkCollection
    charId?: number | undefined
}> = ({ linkCollection, charId }) => {
    const styles = useStyles()
    const ref = useBottomSheetRef()
    const { t } = useTranslation()
    const missingLinkLabelMap: Record<LinkType, string> = {
        ['user_id']: t('character.editor.links.missingUser'),
        ['instruct_id']: t('character.editor.links.missingInstruct'),
        ['model_id']: t('character.editor.links.missingModel'),
        ['connection_index']: t('character.editor.links.missingConnection'),
        ['sampler_index']: t('character.editor.links.missingSampler'),
    }
    const active = linkCollection.active
    const initialIndex = linkCollection.options.findIndex((item) => item.value === active?.value)

    return (
        <Pressable
            style={active ? styles.longContainerActive : styles.longContainer}
            disabled={!!active}
            onPress={() => {
                if (!active) ref.current?.open()
            }}>
            <Text style={active ? styles.labelActive : styles.label}>
                {active ? active.label : missingLinkLabelMap[linkCollection.type]}
            </Text>
            <Pressable
                disabled={!active}
                onPress={() => {
                    if (active) CharacterLink.db.mutate.deleteById(active.id)
                }}>
                <AntDesign
                    name={active ? 'delete' : 'plus'}
                    style={[active ? styles.labelDelete : styles.labelActive, { fontSize: 20 }]}
                />
            </Pressable>

            <ListSheet
                items={linkCollection.options}
                initialIndex={initialIndex !== -1 ? initialIndex : undefined}
                ref={ref}
                keyExtractor={(item) => item.value.toString()}
                labelExtractor={(item) => item.label}
                selectLabel={t('common.actions.link')}
                onSelect={async (item, ref) => {
                    if (charId === undefined || !item) return ref.current?.close()
                    CharacterLink.db.mutate.upsert(charId, linkCollection.type, item.value)
                    ref.current?.close()
                }}
            />
        </Pressable>
    )
}

const CharacterLinksScreen = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const charId = Characters.useCharacterStore((state) => state.id)
    const links = useActiveCharacterLinks(charId ?? -1)

    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                padding: 16,
            }}>
            <HeaderTitle title={t('character.editor.actions.manageLinks')} />
            <Text style={styles.description}>{t('character.editor.links.description')}</Text>
            <FlatList
                contentContainerStyle={{ rowGap: 8 }}
                data={links}
                keyExtractor={(item) => item.type}
                renderItem={({ item }) => (
                    <CharacterLinkItem linkCollection={item} charId={charId} />
                )}
            />
        </SafeAreaView>
    )
}

export default CharacterLinksScreen

const useStyles = () => {
    const { color, spacing, borderWidth } = Theme.useTheme()
    return StyleSheet.create({
        longContainer: {
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.xl,
            borderColor: color.neutral._300,
            minHeight: 64,
            flex: 1,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.xl,
        },
        longContainerActive: {
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.xl,
            borderColor: color.primary._200,
            minHeight: 64,
            flex: 1,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.xl,
        },
        label: {
            color: color.text._700,
            fontSize: 16,
        },
        labelDelete: {
            color: color.error._400,
            fontSize: 16,
        },
        labelActive: {
            color: color.text._100,
            fontSize: 16,
        },
        description: {
            paddingTop: 8,
            paddingBottom: 24,
            paddingHorizontal: 8,
            color: color.text._400,
        },
    })
}
