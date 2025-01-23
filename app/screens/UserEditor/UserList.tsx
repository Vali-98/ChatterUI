import TextBoxModal from '@components/views/TextBoxModal'
import { AntDesign } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { Characters, Style } from '@lib/utils/Global'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import UserListing from './UserListing'

type UserListProps = {
    setShowModal: (b: boolean) => void
}

const UserList: React.FC<UserListProps> = ({ setShowModal }) => {
    const { data } = useLiveQuery(Characters.db.query.cardListQuery('user'))

    const [showNewUser, setShowNewUser] = useState(false)
    const [nowLoading, setNowLoading] = useState(false)
    const { setCard, id } = Characters.useUserCard((state) => ({
        setCard: state.setCard,
        id: state.id,
    }))

    const currentIndex = data.findIndex((item) => item.id === id)

    return (
        <View style={styles.mainContainer}>
            <TextBoxModal
                autoFocus
                booleans={[showNewUser, setShowNewUser]}
                onConfirm={async (text) => {
                    const id = await Characters.db.mutate.createCard(text, 'user')
                    await setCard(id)
                }}
            />
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>User Profiles ({data.length})</Text>
            </View>
            <View style={styles.userListBorder}>
                <FlashList
                    data={data}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <UserListing
                            user={item}
                            nowLoading={nowLoading}
                            setNowLoading={setNowLoading}
                            setShowModal={setShowModal}
                        />
                    )}
                    estimatedItemSize={100}
                    initialScrollIndex={Math.max(currentIndex, 0)}
                />
                <TouchableOpacity style={styles.newUserButton} onPress={() => setShowNewUser(true)}>
                    <AntDesign name="plus" size={18} color={Style.getColor('primary-text2')} />
                    <Text style={styles.buttonText}>New User</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default UserList

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },

    userListBorder: {
        flex: 1,
    },

    userListContainer: {
        flex: 1,
    },

    listHeader: {
        paddingHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    listTitle: {
        fontSize: 18,
        color: Style.getColor('primary-text2'),
    },

    buttonText: {
        fontSize: 16,
        color: Style.getColor('primary-text1'),
    },

    newUserButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingVertical: 8,
        marginTop: 4,
        columnGap: 8,
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface4'),
    },
})
