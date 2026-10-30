import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Drawer from '@components/views/Drawer'
import { EdgeFadeFlashList } from '@components/views/EdgeFade'
import { YAxisOnlyTransition } from '@lib/animations/transitions'
import { useDebounce } from '@lib/hooks/Debounce'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import { getShadowColor } from '@lib/theme/contrast'
import { Theme } from '@lib/theme/ThemeManager'

import ChatDrawerItem from './ChatDrawerItem'
import ChatDrawerSearchItem from './ChatDrawerSearchItem'

const ChatsDrawer = () => {
    const styles = useStyles()
    const { t } = useTranslation()
    const { show, setShow } = Drawer.useDrawerStore(
        useShallow((state) => ({
            show: state.values[Drawer.ID.CHATLIST],
            setShow: state.setShow,
        }))
    )
    const { characterId } = Characters.useCharacterState(
        useShallow((state) => ({ characterId: state.id ?? -1 }))
    )
    const targetChar = show ? characterId : -1
    const { data } = useLiveQueryAsync(Chats.db.live.chatList(targetChar), {
        key: ['chat-list', targetChar],
        watch: [{ table: 'chats' }, { table: 'chat_entries' }],
        enabled: show,
    })

    const setShowDrawer = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    const { setId } = Chats.useChat()

    const [searchResults, setSearchResults] = useState<
        Awaited<ReturnType<typeof Chats.db.query.searchResults>>
    >([])

    const [showSearchBar, setShowSearchBar] = useState(false)
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const handleLoadChat = async (chatId: number) => {
        await setId(chatId)
        setShowDrawer(false)
    }

    const search = useDebounce((query: string, characterId?: number) => {
        if (!characterId || !query) return
        try {
            setSearchResults(Chats.db.query.searchResults(characterId, query))
        } catch (error) {
            Logger.error(t('chat.drawer.search.errors.queryFailed', { error: String(error) }))
            setSearchResults([])
        }
        setShowSearchResults(true)
    }, 500)

    const setSearch = (query: string) => {
        setSearchQuery(query)
        search(query, characterId)
    }

    const handleCreateChat = async () => {
        if (characterId)
            Chats.actions.createChat(characterId).then((chatId) => {
                if (chatId) handleLoadChat(chatId)
            })
    }

    return (
        <Drawer.Body drawerID={Drawer.ID.CHATLIST} drawerStyle={styles.drawer} direction="right">
            <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.drawerTitle}>
                    {showSearchBar ? t('chat.drawer.search.title') : t('chat.drawer.title')}
                </Text>
                <IconButton
                    variant="tertiary"
                    iconName={showSearchBar ? 'menu' : { family: 'material', name: 'search' }}
                    onPress={() => {
                        setShowSearchBar(!showSearchBar)
                        setShowSearchResults(searchQuery.length > 0 && !showSearchBar)
                    }}
                />
            </View>
            <Animated.View key={showSearchBar + ''} entering={FadeIn} exiting={FadeOut}>
                {showSearchBar && (
                    <ThemedTextInput
                        placeholder={t('chat.drawer.search.placeholder')}
                        viewStyle={{ marginTop: 12, marginBottom: 12 }}
                        value={searchQuery}
                        autoCorrect={false}
                        onChangeText={setSearch}
                        submitBehavior="submit"
                    />
                )}
            </Animated.View>
            {!showSearchResults && (
                <>
                    <Animated.View
                        layout={YAxisOnlyTransition}
                        entering={FadeIn.duration(200)}
                        style={styles.listContainer}>
                        <EdgeFadeFlashList
                            containerStyle={{ flex: 1 }}
                            keyboardShouldPersistTaps="always"
                            data={data}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item, index }) => (
                                <ChatDrawerItem item={item} onLoad={handleLoadChat} />
                            )}
                            showsVerticalScrollIndicator={false}
                            removeClippedSubviews={false}
                        />
                    </Animated.View>
                    <Animated.View entering={FadeIn} exiting={FadeOut}>
                        <ThemedButton
                            label={t('chat.drawer.actions.startNewChat')}
                            variant="primary"
                            level="primary"
                            onPress={handleCreateChat}
                        />
                    </Animated.View>
                </>
            )}
            {showSearchResults && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.listContainer}>
                    {searchResults.length > 0 && (
                        <Text style={styles.resultCount}>
                            {t('chat.drawer.search.resultsFound', { count: searchResults.length })}
                        </Text>
                    )}
                    <EdgeFadeFlashList
                        containerStyle={{ flex: 1 }}
                        data={searchResults}
                        keyExtractor={(item) => item.swipe_id.toString()}
                        renderItem={({ item }) => (
                            <ChatDrawerSearchItem
                                item={item}
                                onLoad={handleLoadChat}
                                query={searchQuery}
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {t('chat.drawer.search.noResults')}
                                </Text>
                            </View>
                        )}
                    />
                </Animated.View>
            )}
        </Drawer.Body>
    )
}

export default ChatsDrawer

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        drawer: {
            backgroundColor: color.neutral._100,
            width: '90%',
            shadowColor: getShadowColor(color.shadow),
            borderTopWidth: 3,
            elevation: 20,
            right: 0,
            position: 'absolute',
            height: '100%',
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl2,
        },

        drawerTitle: {
            color: color.text._300,
            fontSize: fontSize.xl,
            paddingLeft: spacing.s,
        },

        title: {
            color: color.text._100,
            fontSize: fontSize.l,
        },

        emptyText: {
            color: color.text._400,
            fontSize: fontSize.m,
            fontStyle: 'italic',
        },

        emptyContainer: {
            flex: 1,
            alignItems: 'center',
            padding: spacing.xl3,
        },

        resultCount: {
            color: color.text._600,
            fontSize: fontSize.s,
            marginBottom: spacing.m,
        },

        listContainer: {
            flex: 1,
            marginTop: spacing.m,
            marginBottom: spacing.l,
        },
    })
}
