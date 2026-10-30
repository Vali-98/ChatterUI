import { type IconName } from '@components/icons/ThemedIcon'

import ButtonBase, { type ButtonAppearanceProps } from './ButtonBase'

export interface IconButtonProps extends ButtonAppearanceProps {
    iconName: IconName
}

const IconButton = ({ variant = 'tertiary', ...props }: IconButtonProps) => (
    <ButtonBase {...props} variant={variant} />
)

export default IconButton
