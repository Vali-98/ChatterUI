import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import ListSheet from '@components/input/ListSheet'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import HeaderTitle from '@components/views/HeaderTitle'
import { LinkType } from '@db/schema'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { Model } from '@lib/engine/Local/Model'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { Characters } from '@lib/state/characters'
import { CharacterLinks } from '@lib/state/characters/links'
import { Instructs } from '@lib/state/Instructs'
import { useSamplerStore } from '@lib/state/samplerStore'
import { Theme } from '@lib/theme/ThemeManager'

type Link = { value: number; label: string }

type LinkCollection = {
    options: Link[]
    active: (Link & { id: number }) | undefined
    type: LinkType
}

const useActiveCharacterLinks = (characterId: number): LinkCollection[] => {
    // db lists
    const data =
        Characters.useCharacterState((state) =>
            state.id === characterId ? state.card?.links : undefined
        ) ?? []

    const { data: userList } = useLiveQuerySync(
        Characters.db.live.cardSummaries({ type: 'user' }),
        {
            key: ['user-list-simple'],
            watch: [{ table: 'characters' }],
        }
    )
    const { data: instructList } = useLiveQuerySync(Instructs.db.query.instructListQuery(), {
        key: ['instruct-list'],
        watch: [{ table: 'instructs' }],
    })
    const { data: modelList } = useLiveQuerySync(Model.getModelListQuery(), {
        key: ['model-list'],
        watch: [{ table: 'model_data' }, { table: 'model_mmproj_links' }],
    })
    const samplerList = useSamplerStore((state) => state.configList)
    const connectionsList = useConnectionStore((state) => state.connections)

    // derived active values
    const userLink = data.find((link) => link.type === 'user_id')
    const activeUser = userList.find((user) => user.id === userLink?.value)

    const instructLink = data.find((link) => link.type === 'instruct_id')
    const activeInstruct = instructList.find((instruct) => instruct.id === instructLink?.value)

    const modelLink = data.find((link) => link.type === 'model_id')
    const activeModel = modelList.find((model) => model.id === modelLink?.id)

    const samplerLink = data.find((link) => link.type === 'sampler_id')
    const samplerId = samplerLink?.value
    const activeSampler = samplerList.find((config) => config.id === samplerId)

    const connectionLink = data.find((link) => link.type === 'connection_id')
    const connectionId = connectionLink?.value
    const activeConnection = connectionsList.find((connection) => connection.id === connectionId)

    return [
        {
            options: userList.map((item) => ({ label: item.name, value: item.id })),
            active:
                activeUser && userLink
                    ? { label: activeUser.name, value: activeUser.id, id: userLink.id }
                    : undefined,
            type: 'user_id',
        },
        {
            options: instructList.map((item) => ({ label: item.name, value: item.id })),
            active:
                activeInstruct && instructLink
                    ? { label: activeInstruct.name, value: activeInstruct.id, id: instructLink.id }
                    : undefined,
            type: 'instruct_id',
        },
        {
            options: samplerList.map((item) => ({ label: item.name, value: item.id })),
            active:
                activeSampler && samplerId !== undefined && samplerLink
                    ? { label: activeSampler.name, value: samplerId, id: samplerLink.id }
                    : undefined,
            type: 'sampler_id',
        },
        {
            options: connectionsList.map((item) => ({
                label: item.friendlyName,
                value: item.id,
            })),
            active:
                activeConnection && connectionId !== undefined && connectionLink
                    ? {
                          label: activeConnection.friendlyName,
                          value: connectionId,
                          id: connectionLink.id,
                      }
                    : undefined,
            type: 'connection_id',
        },
        {
            options: modelList.map((item) => ({
                label: item.name,
                value: item.id,
            })),
            active:
                activeModel && modelLink
                    ? { label: activeModel.name, value: modelLink.id, id: modelLink.id }
                    : undefined,
            type: 'model_id',
        },
    ]
}

const CharacterLinkItem: React.FC<{
    linkCollection: LinkCollection
    characterId?: number | undefined
}> = ({ linkCollection, characterId }) => {
    const styles = useStyles()
    const ref = useBottomSheetRef()
    const { t } = useTranslation()
    const missingLinkLabelMap: Record<LinkType, string> = {
        ['user_id']: t('character.editor.links.missingUser'),
        ['instruct_id']: t('character.editor.links.missingInstruct'),
        ['model_id']: t('character.editor.links.missingModel'),
        ['connection_id']: t('character.editor.links.missingConnection'),
        ['sampler_id']: t('character.editor.links.missingSampler'),
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
                    if (active) CharacterLinks.db.delete.link(active.id)
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
                    if (characterId === undefined || !item) return ref.current?.close()
                    CharacterLinks.db.upsert.link(characterId, {
                        type: linkCollection.type,
                        value: item.value,
                    })
                    ref.current?.close()
                }}
            />
        </Pressable>
    )
}

const CharacterLinksScreen = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const characterId = Characters.useCharacterState((state) => state.id)
    const links = useActiveCharacterLinks(characterId ?? -1)

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
                    <CharacterLinkItem linkCollection={item} characterId={characterId} />
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
