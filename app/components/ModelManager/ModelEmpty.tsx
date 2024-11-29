import { AntDesign } from '@expo/vector-icons'
import { Style } from 'constants/Global'
import { View, Text } from 'react-native'

const ModelEmpty = () => {
    return (
        <View
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
            }}>
            <AntDesign name="unknowfile1" size={60} color={Style.getColor('primary-text3')} />
            <Text
                style={{
                    color: Style.getColor('primary-text2'),
                    marginTop: 16,
                    fontStyle: 'italic',
                    fontSize: 16,
                }}>
                No Models Found. Try Importing Some!
            </Text>
        </View>
    )
}

export default ModelEmpty
