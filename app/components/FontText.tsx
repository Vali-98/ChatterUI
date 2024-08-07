import { Text, TextProps } from 'react-native'

const FontText: React.FC<TextProps> = ({ children, style, ...props }) => {
    const customFontStyle = [{ fontFamily: 'caskaydia-cove' }, style]

    return (
        <Text style={customFontStyle} {...props}>
            {children}
        </Text>
    )
}

export default FontText
