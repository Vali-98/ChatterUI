import ThemedButton from '@components/buttons/ThemedButton'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { SafeAreaView } from 'react-native-safe-area-context'
import ConnectionItem from './ConnectionItem'

const ConnectionsManagerScreen = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { apiValues } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            apiValues: state.values,
        }))
    )
    const { color, spacing } = Theme.useTheme()

    const router = useRouter()
    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                paddingTop: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <HeaderTitle title="API Manager" />
            <HeaderButton
                headerRight={() => (
                    <Pressable
                        onPressIn={() => {
                            router.push('/screens/ConnectionsManagerScreen/TemplateManager')
                        }}>
                        <AntDesign name="file1" color={color.text._400} size={26} />
                    </Pressable>
                )}
            />
            {apiValues.length > 0 && (
                <FlatList
                    style={{
                        paddingHorizontal: spacing.xl,
                    }}
                    contentContainerStyle={{ rowGap: 4, paddingBottom: 24 }}
                    data={apiValues}
                    keyExtractor={(item, index) => item.configName + index}
                    renderItem={({ item, index }) => <ConnectionItem item={item} index={index} />}
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
                onPress={() => router.push('/screens/ConnectionsManagerScreen/AddConnection')}
                label="Add Connection"
            />
        </SafeAreaView>
    )
}

export default ConnectionsManagerScreen
