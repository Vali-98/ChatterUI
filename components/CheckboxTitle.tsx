import { Color } from '@globals'
import CheckBox from '@react-native-community/checkbox'
import { View, Text } from 'react-native'

type CheckboxTitleProps = {
    name: string
    body: any
    varname: string
    setValue: (item: any) => {}
    onChange: undefined | ((item: any) => {})
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
                tintColors={{ false: Color.White, true: Color.White }}
                onFillColor={Color.White}
                onCheckColor={Color.White}
                value={body[varname]}
                onValueChange={
                    onChange !== undefined
                        ? (value) => onChange(value)
                        : (value) => setValue({ ...body, [varname]: value })
                }
            />
            <Text style={{ paddingLeft: 8, color: Color.Text }}>{name}</Text>
        </View>
    )
}

export default CheckboxTitle
