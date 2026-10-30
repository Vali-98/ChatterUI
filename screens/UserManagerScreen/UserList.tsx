import { FlashList } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import InputSheet from '@components/views/InputSheet'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Characters } from '@lib/state/characters'
import { Theme } from '@lib/theme/ThemeManager'

import UserListing from './UserListing'

const UserList = () => {
    const { t } = useTranslation()
    const { color, spacing, fontSize } = Theme.useTheme()

    const { data } = useLiveQueryAsync(Characters.db.live.cardList({ type: 'user' }), {
        key: ['user-list'],
        watch: [
            { table: 'characters' },
            { table: 'character_tags' },
            { table: 'tags' },
            { table: 'chats' },
            { table: 'chat_entries' },
            { table: 'chat_swipes' },
        ],
    })

    const newUserInputRef = useBottomSheetRef()
    const { setCard, id } = Characters.useUserStore(
        useShallow((state) => ({
            setCard: state.setCard,
            id: state.id,
        }))
    )

    const currentIndex = data.findIndex((item) => item.id === id)

    return (
        <View style={{ flex: 1 }}>
            <InputSheet
                ref={newUserInputRef}
                title={t('users.create')}
                autoFocus
                onConfirm={async (text) => {
                    const id = await Characters.db.create.blankCard(text, { type: 'user' })
                    setCard(id)
                }}
            />
            <View
                style={{
                    paddingHorizontal: spacing.xl,
                    marginBottom: spacing.l,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}>
                <Text
                    style={{
                        fontSize: fontSize.l,
                        color: color.text._300,
                    }}>
                    {t('users.profilecount')} ({data.length})
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <FlashList
                    data={data}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => <UserListing user={item} />}
                    initialScrollIndex={Math.max(currentIndex, 0)}
                />
                <ThemedButton
                    label={t('users.create')}
                    variant="primary"
                    level="primary"
                    onPress={() => newUserInputRef.current?.open()}
                />
            </View>
        </View>
    )
}

export default UserList
