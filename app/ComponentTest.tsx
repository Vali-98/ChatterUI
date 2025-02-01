import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import React, { useState } from 'react'
import { ScrollView, View } from 'react-native'
const data = [
    { label: 'Item 0', value: '1' },
    { label: 'Item 1', value: '1' },
    { label: 'Item 2', value: '2' },
    { label: 'Item 3', value: '3' },
    { label: 'Item 4', value: '4' },
    { label: 'Item 5', value: '5' },
    { label: 'Item 6', value: '6' },
    { label: 'Item 7', value: '7' },
    { label: 'Item 8', value: '8' },
]

const buttonVariants = ['primary', 'secondary', 'tertiary', 'critical', 'disabled']

const ComponentTest = () => {
    const [selected, setSelected] = useState<typeof data>([])
    const [slider, setSlider] = useState(0)
    const [data, setData] = useState<string[]>([])

    return (
        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="always">
            <View style={{ rowGap: 20, marginBottom: 20 }}>
                {buttonVariants.map((item) => (
                    //@ts-ignore
                    <ThemedButton variant={item} key={item} label={`Variant: ${item}`} />
                ))}
            </View>

            <StringArrayEditor title="Test Input Label" value={data} setValue={setData} />
        </ScrollView>
    )
}

export default ComponentTest
