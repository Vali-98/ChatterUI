import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Ionicons } from '@expo/vector-icons'
import { ToolState } from '@lib/state/ToolState'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import { FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ToolItem from './ToolItem'

const ToolManagerScreen = () => {
    const { tools } = ToolState.useToolStore(
        useShallow((state) => ({
            tools: state.tools,
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
            <HeaderTitle title="Tool Manager" />

            {tools.length > 0 && (
                <FlatList
                    style={{
                        paddingHorizontal: spacing.xl,
                    }}
                    contentContainerStyle={{ rowGap: 4, paddingBottom: 24 }}
                    data={tools}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => <ToolItem tool={item} index={index} />}
                    removeClippedSubviews={false}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {tools.length === 0 && (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="build-outline" size={64} color={color.text._700} />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        No Tools Available
                    </Text>
                </View>
            )}

            <ThemedButton
                buttonStyle={{
                    marginHorizontal: spacing.xl,
                }}
                onPress={() => router.push('/screens/ToolManagerScreen/AddTool')}
                label="Add Custom Tool"
            />
        </SafeAreaView>
    )
}

export default ToolManagerScreen
