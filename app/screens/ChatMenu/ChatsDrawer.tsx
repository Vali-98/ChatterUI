import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Drawer from '@components/views/Drawer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { FlashList } from '@shopify/flash-list'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import ChatDrawerItem from './ChatDrawerItem'
import ChatDrawerSearchItem from './ChatDrawerSearchItem'

const ChatsDrawer = () => {
    const styles = useStyles()

    const { charId } = Characters.useCharacterCard((state) => ({ charId: state.id }))
    const { data } = useLiveQuery(Chats.db.query.chatListQuery(charId ?? 0))
    const { setShowDrawer } = Drawer.useDrawerState((state) => ({
        setShowDrawer: (b: boolean) => state.setShow(Drawer.ID.CHATLIST, b),
    }))

    const { loadChat } = Chats.useChat()

    const [searchResults, setSearchResults] = useState<
        Awaited<ReturnType<typeof Chats.db.query.searchChat>>
    >([])

    const [showSearchBar, setShowSearchBar] = useState(false)
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const handleLoadChat = async (chatId: number) => {
        await loadChat(chatId)
        setShowDrawer(false)
    }

    const handleCreateChat = async () => {
        if (charId)
            Chats.db.mutate.createChat(charId).then((chatId) => {
                if (chatId) handleLoadChat(chatId)
            })
    }

    return (
        <Drawer.Body drawerID={Drawer.ID.CHATLIST} drawerStyle={styles.drawer} direction="right">
            <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.drawerTitle}>Chats</Text>
                <ThemedButton
                    variant="tertiary"
                    iconName={showSearchBar ? 'close' : 'search1'}
                    onPress={() => {
                        setShowSearchBar(!showSearchBar)
                        setShowSearchResults(searchQuery.length > 0 && !showSearchBar)
                    }}
                />
            </View>
            {showSearchBar && (
                <ThemedTextInput
                    placeholder="Search for message..."
                    containerStyle={{ flex: 0, marginTop: 12 }}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={async () => {
                        if (!searchQuery || !charId) return
                        const results = await Chats.db.query.searchChat(searchQuery, charId)
                        setSearchResults(
                            results.sort((a, b) => b.sendDate.getTime() - a.sendDate.getTime())
                        )
                        setShowSearchResults(true)
                    }}
                    submitBehavior="submit"
                />
            )}
            {!showSearchResults && (
                <View style={styles.listContainer}>
                    <FlashList
                        estimatedItemSize={82}
                        data={data}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item, index }) => (
                            <ChatDrawerItem item={item} onLoad={handleLoadChat} />
                        )}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                    />
                    <ThemedButton label="New Chat" onPress={handleCreateChat} />
                </View>
            )}
            {showSearchResults &&
                (searchResults.length > 0 ? (
                    <View style={styles.listContainer}>
                        <Text style={styles.resultCount}>Results: {searchResults.length}</Text>
                        <FlashList
                            estimatedItemSize={92}
                            data={searchResults}
                            keyExtractor={(item) => item.swipeId.toString()}
                            renderItem={({ item }) => (
                                <ChatDrawerSearchItem
                                    item={item}
                                    onLoad={handleLoadChat}
                                    query={searchQuery}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            removeClippedSubviews={false}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No Results</Text>
                    </View>
                ))}
        </Drawer.Body>
    )
}

export default ChatsDrawer

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        drawer: {
            backgroundColor: color.neutral._100,
            width: '80%',
            shadowColor: color.shadow,
            left: '20%',
            borderTopWidth: 3,
            elevation: 20,
            position: 'absolute',
            height: '100%',
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl2,
        },

        drawerTitle: {
            color: color.text._300,
            fontSize: fontSize.xl,
            paddingLeft: spacing.xl,
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
