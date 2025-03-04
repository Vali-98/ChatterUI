import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Accordion from '@components/views/Accordion'
import React, { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

const selectorData = [
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
    const [selected, setSelected] = useState<(typeof selectorData)[0]>(selectorData[0])
    const [selectedM, setSelectedM] = useState<typeof selectorData>([])
    const [slider, setSlider] = useState(0)
    const [data, setData] = useState<string[]>([])
    const [textInputData, setTextInputData] = useState('')
    const [checkbox, setCheckbox] = useState(true)
    const [sw, setSw] = useState(true)

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ rowGap: 16, padding: 16 }}
            keyboardShouldPersistTaps="always">
            <View style={{ rowGap: 8 }}>
                {buttonVariants.map((item) => (
                    //@ts-ignore
                    <ThemedButton variant={item} key={item} label={`Button Variant: ${item}`} />
                ))}
            </View>
            <Accordion label="Test Accordion">
                <Text style={{ color: 'yellow' }}>TEST TEXT</Text>
            </Accordion>
            <StringArrayEditor label="Test Input Label" value={data} setValue={setData} />
            <ThemedCheckbox label="Test Checkbox" value={checkbox} onChangeValue={setCheckbox} />
            <ThemedSwitch label="Test Switch" value={sw} onChangeValue={setSw} />
            <ThemedSlider
                value={slider}
                onValueChange={setSlider}
                min={0}
                max={10}
                step={1}
                label="Test Slider"
            />
            <ThemedTextInput
                label="Test Text"
                value={textInputData}
                onChangeText={setTextInputData}
            />
            <DropdownSheet
                data={selectorData}
                selected={selected}
                onChangeValue={setSelected}
                labelExtractor={(item) => item.label}
            />
            <MultiDropdownSheet
                data={selectorData}
                selected={selectedM}
                onChangeValue={setSelectedM}
                labelExtractor={(item) => item.label}
            />
        </ScrollView>
    )
}

export default ComponentTest
