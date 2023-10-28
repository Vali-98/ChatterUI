import { View, Text } from 'react-native'
import CheckBox from '@react-native-community/checkbox'
import { Color } from '@globals'

const CheckboxTitle = ({name, body, varname, setValue}) => {
  return (
    <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox 
                tintColors={{false:Color.White, true:Color.White}}
                onFillColor={Color.White}
                onCheckColor={Color.White}
                value={body[varname]}
                onValueChange={value => setValue({...body, [varname]: value})}
            />
            <Text style={{paddingLeft: 8, color:Color.Text }}>{name}</Text>
        </View>
  )
}

export default CheckboxTitle