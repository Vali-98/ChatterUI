import { type StyleProp, type TextStyle } from 'react-native'

import { type IconName } from '@components/icons/ThemedIcon'
import { IconSizes } from '@lib/constants/IconSizes'

import ButtonBase, { type ButtonAppearanceProps } from './ButtonBase'

export type { ButtonLevel, ButtonVariant } from './ButtonBase'

export interface ThemedButtonProps extends ButtonAppearanceProps {
    label: string
    labelStyle?: StyleProp<TextStyle>
    iconName?: IconName
}

const ThemedButton = ({
    variant = 'secondary',
    iconSize = IconSizes.buttonLabel,
    ...props
}: ThemedButtonProps) => <ButtonBase {...props} variant={variant} iconSize={iconSize} />

export default ThemedButton
