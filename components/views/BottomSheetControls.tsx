import { Children, type PropsWithChildren } from 'react'
import { View } from 'react-native'

import ThemedButton, { type ThemedButtonProps } from '@components/buttons/ThemedButton'

type BottomSheetButtonProps = Omit<ThemedButtonProps, 'onPress'> & {
    onPress: NonNullable<ThemedButtonProps['onPress']>
}

export const BottomSheetButton = ({ viewStyle, ...props }: BottomSheetButtonProps) => (
    <ThemedButton {...props} viewStyle={[{ minWidth: 100, paddingHorizontal: 8 }, viewStyle]} />
)

const BottomSheetControls = ({ children }: PropsWithChildren) => {
    return (
        <View
            style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent:
                    Children.toArray(children).length > 1 ? 'space-between' : 'flex-end',
                alignSelf: 'stretch',
                columnGap: 8,
                rowGap: 8,
                marginTop: 8,
            }}>
            {children}
        </View>
    )
}

export default BottomSheetControls
