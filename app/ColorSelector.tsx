import HeaderTitle from '@components/views/HeaderTitle'
import { Ionicons } from '@expo/vector-icons'
import { DefaultColorSchemes } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { View, ScrollView, Text, TouchableOpacity } from 'react-native'

const ColorSelector = () => {
    const { color, setColor } = Theme.useColorState((state) => ({
        color: state.color,
        setColor: state.setColor,
    }))

    return (
        <View style={{ padding: 16 }}>
            <HeaderTitle title="Themes" />
            <ScrollView contentContainerStyle={{ rowGap: 8 }}>
                {DefaultColorSchemes.schemes.map((item) => (
                    <TouchableOpacity
                        onPress={() => setColor(item)}
                        style={{
                            borderColor: item.text._100,
                            borderWidth: 1,
                            backgroundColor: item.neutral._100,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: 'center',
                            columnGap: 16,
                            flexDirection: 'row',
                        }}
                        key={item.name}>
                        <View
                            style={{
                                padding: 8,
                                backgroundColor: item.primary._500,
                                borderRadius: 24,
                            }}
                        />
                        <Text style={{ color: item.text._100 }}>{item.name}</Text>
                        {color.name === item.name && (
                            <Ionicons name="checkmark" color={item.text._100} size={16} />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )
}

export default ColorSelector
