import { useRouter } from 'expo-router'
import { Text, TouchableOpacity } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import Avatar from '@components/views/Avatar'
import { Characters } from '@lib/state/characters'
import { Theme } from '@lib/theme/ThemeManager'

const UserInfo = () => {
    const router = useRouter()
    const { color, spacing, borderWidth, fontSize } = Theme.useTheme()
    const { userName, imageID } = Characters.useUserStore(
        useShallow((state) => ({
            userName: state.card?.name,
            imageID: state.card?.image_id ?? 0,
        }))
    )
    return (
        <TouchableOpacity
            onPress={() => {
                router.push('/screens/UserManagerScreen')
            }}
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

            <Text style={{ fontSize: fontSize.xl, color: color.text._100 }}>{userName}</Text>
        </TouchableOpacity>
    )
}

export default UserInfo
