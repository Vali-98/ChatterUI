import ThemedButton from '@components/buttons/ThemedButton'
import Avatar from '@components/views/Avatar'
import { Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import { View, Text } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const UserInfo = () => {
    const router = useRouter()
    const { color, spacing, borderWidth, fontSize } = Theme.useTheme()
    const { userName, imageID } = Characters.useUserCard(
        useShallow((state) => ({
            userName: state.card?.name,
            imageID: state.card?.image_id ?? 0,
        }))
    )
    return (
        <View
            style={{
                alignItems: 'center',
                columnGap: spacing.l,
                paddingBottom: spacing.xl,
                paddingTop: spacing.xl2,
                padding: spacing.xl,
            }}>
            <Avatar
                targetImage={Characters.getImageDir(imageID)}
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: spacing.xl,
                    borderColor: color.primary._500,
                    borderWidth: borderWidth.m,
                    marginBottom: spacing.m,
                }}
            />

            <ThemedButton
                onPress={() => router.push('/screens/UserEditor')}
                label={userName}
                labelStyle={{ fontSize: fontSize.xl }}
                iconName="edit"
                variant="tertiary"
                iconSize={20}
            />
        </View>
    )
}

export default UserInfo
