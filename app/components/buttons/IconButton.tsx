import { type IconName } from '@components/icons/ThemedIcon'
import { IconSizes } from '@lib/constants/IconSizes'

import ButtonBase, { type ButtonAppearanceProps } from './ButtonBase'

export interface IconButtonProps extends ButtonAppearanceProps {
    iconName: IconName
}

const IconButton = ({
    variant = 'tertiary',
    iconSize = IconSizes.button,
    ...props
}: IconButtonProps) => <ButtonBase {...props} variant={variant} iconSize={iconSize} />

export default IconButton
