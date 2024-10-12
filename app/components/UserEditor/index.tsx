import { Stack } from 'expo-router'
import { View, StyleSheet } from 'react-native'

import UserCardEditor from './UserCardEditor'
import UserList from './UserList'

const UserEditor = () => {
    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'Edit User',
                    animation: 'simple_push',
                }}
            />
            <UserCardEditor />
            <UserList />
        </View>
    )
}

export default UserEditor

const styles = StyleSheet.create({
    mainContainer: {
        paddingBottom: 24,
        flex: 1,
    },
})
