import AntDesign, { type AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import { type Href, useRouter } from 'expo-router'
import { View } from 'react-native'

import ListButton from '@components/buttons/ListButton'
import { ListCardSection } from '@components/views/ListCard'
import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

const SettingsLink = ({
    href,
    icon,
    title,
    description,
    onPress,
}: {
    href?: Href
    onPress?: () => void
    icon: AntDesignIconName
    title: string
    description?: string
}) => {
    const router = useRouter()
    const { color } = Theme.useTheme()
    return (
        <ListButton
            active={false}
            onPress={
                onPress ??
                (() => {
                    if (href) router.push(href)
                })
            }
            style={{ padding: 14, columnGap: 14 }}>
            <ListCardSection style={{ columnGap: 14, flex: 1 }}>
                <View style={{ padding: 10 }}>
                    <AntDesign name={icon} size={21} color={color.text._100} />
                </View>
                <View style={{ flex: 1, rowGap: 4 }}>
                    <TText size={16}>{title}</TText>
                    {description && (
                        <TText color="400" size={12}>
                            {description}
                        </TText>
                    )}
                </View>
            </ListCardSection>
            <ListCardSection>
                <AntDesign name="right" size={14} color={color.text._400} />
            </ListCardSection>
        </ListButton>
    )
}

export default SettingsLink
