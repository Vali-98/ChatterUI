import ThemedButton from '@components/buttons/ThemedButton'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { APIState } from '@lib/engine/API/APIManagerState'
import { Theme } from '@lib/theme/ThemeManager'
import { Stack, useRouter } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'

import APIValueItem from './APIValueItem'

const APIManager = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { apiValues } = APIState.useAPIState((state) => ({
        apiValues: state.values,
    }))
    const { color, spacing } = Theme.useTheme()

    const router = useRouter()
    return (
        <View
            style={{
                paddingTop: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <Stack.Screen
                options={{
                    title: 'API Manager',
                    headerRight: () => (
                        <Pressable
                            onPressIn={() => {
                                router.push('/screens/APIManager/TemplateManager')
                            }}>
                            <AntDesign name="setting" color={color.text._400} size={26} />
                        </Pressable>
                    ),
                }}
            />
            {apiValues.length > 0 && (
                <FlatList
                    style={{
                        paddingHorizontal: spacing.xl,
                    }}
                    contentContainerStyle={{ rowGap: 4, paddingBottom: 24 }}
                    data={apiValues}
                    keyExtractor={(item, index) => item.configName + index}
                    renderItem={({ item, index }) => <APIValueItem item={item} index={index} />}
                    removeClippedSubviews={false}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {apiValues.length === 0 && (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cloud-offline-outline" size={64} color={color.text._700} />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        No Connections Added
                    </Text>
                </View>
            )}

            <ThemedButton
                buttonStyle={{
                    marginHorizontal: spacing.xl,
                }}
                onPress={() => router.push('/screens/APIManager/AddAPI')}
                label="Add Connection"
            />
        </View>
    )
}

export default APIManager
