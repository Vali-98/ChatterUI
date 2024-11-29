import { Ionicons } from '@expo/vector-icons'
import { Style } from 'constants/Global'
import { Text, View } from 'react-native'

const CharSearchEmpty = () => {
    return (
        <View
            style={{
                paddingVertical: 16,
                paddingHorizontal: 8,
                flex: 1,
                alignItems: 'center',
                marginTop: 30,
            }}>
            <Ionicons name="search" color={Style.getColor('primary-text2')} size={60} />
            <Text
                style={{
                    color: Style.getColor('primary-text2'),
                    marginTop: 16,
                    fontStyle: 'italic',
                    fontSize: 16,
                }}>
                No Characters Match Search Result
            </Text>
        </View>
    )
}

export default CharSearchEmpty
