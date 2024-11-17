import { Style } from '@globals'
import CheckBox from 'expo-checkbox'
import { View, Text } from 'react-native'

type CheckboxTitleProps = {
    name: string
    body: any
    varname: string
    setValue: (item: any) => void
    onChange?: undefined | ((item: any) => void)
}

const CheckboxTitle: React.FC<CheckboxTitleProps> = ({
    name,
    body,
    varname,
    setValue,
    onChange = undefined,
}) => {
    return (
        <View style={{ flexDirection: `row`, alignItems: `center`, paddingVertical: 4 }}>
            <CheckBox
                color={Style.getColor('primary-brand')}
                value={body[varname]}
                onValueChange={
                    onChange !== undefined
                        ? (value) => onChange(value)
                        : (value) => setValue({ ...body, [varname]: value })
                }
            />
            <Text style={{ paddingLeft: 8, color: Style.getColor('primary-text1') }}>{name}</Text>
        </View>
    )
}

export default CheckboxTitle
