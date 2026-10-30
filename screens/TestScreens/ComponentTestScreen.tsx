/* eslint-disable i18next/no-literal-string */
import { useState } from 'react'
import { Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import HorizontalSelector from '@components/input/HorizontalSelector'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ListEditorSheet from '@components/input/ListEditorSheet'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import CollapsableTitle from '@components/text/CollapsableTitle'
import TText from '@components/text/TText'
import Accordion from '@components/views/Accordion'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import InputSheet from '@components/views/InputSheet'
import { Theme } from '@lib/theme/ThemeManager'

const selectorData = [
    { label: 'Item 0', value: '0' },
    { label: 'Item 1', value: '1' },
    { label: 'Item 2', value: '2' },
    { label: 'Item 3', value: '3' },
    { label: 'Item 4', value: '4' },
    { label: 'Item 5', value: '5' },
    { label: 'Item 6', value: '6' },
    { label: 'Item 7', value: '7' },
    { label: 'Item 8', value: '8' },
]

const buttonVariants = ['primary', 'secondary', 'tertiary'] as const
const buttonLevels = ['neutral', 'muted', 'primary', 'warning', 'error'] as const

const ComponentTestScreen = () => {
    const [selected, setSelected] = useState<(typeof selectorData)[0]>(selectorData[0])
    const [hSelected, setHSelected] = useState('medium')
    const [selectedM, setSelectedM] = useState<typeof selectorData>([])
    const [slider, setSlider] = useState(0)
    const [data, setData] = useState<string[]>([])
    const [textInputData, setTextInputData] = useState('')
    const [checkbox, setCheckbox] = useState(true)
    const [sw, setSw] = useState(true)
    const [menuAction, setMenuAction] = useState('No action yet')
    const [keepMenuOpen, setKeepMenuOpen] = useState(true)
    const [showHiddenItem, setShowHiddenItem] = useState(false)
    const [showDisabledItem, setShowDisabledItem] = useState(false)
    const { color } = Theme.useTheme()
    const inputRef = useBottomSheetRef()

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ rowGap: 16, padding: 16 }}
                keyboardShouldPersistTaps="always">
                <HorizontalSelector
                    label="Selector"
                    description="Example description for Selector"
                    values={['high', 'medium', 'low'].map((item) => ({
                        label: item.charAt(0).toUpperCase() + item.slice(1),
                        value: item,
                    }))}
                    selected={hSelected}
                    onPress={(s) => {
                        setHSelected(s)
                    }}
                />

                <CollapsableTitle title="Buttons">
                    <View style={{ rowGap: 16 }}>
                        {buttonLevels.map((level) => (
                            <View key={level} style={{ rowGap: 8 }}>
                                <TText>{level}</TText>
                                {buttonVariants.map((variant) => (
                                    <View
                                        key={variant}
                                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        <ThemedButton
                                            label={variant}
                                            variant={variant}
                                            level={level}
                                        />
                                        <ThemedButton
                                            label={variant}
                                            variant={variant}
                                            level={level}
                                            disabled
                                        />
                                        <IconButton
                                            iconName="edit"
                                            variant={variant}
                                            level={level}
                                        />
                                        <IconButton
                                            iconName="edit"
                                            variant={variant}
                                            level={level}
                                            disabled
                                        />
                                    </View>
                                ))}
                            </View>
                        ))}
                        <View style={{ flexDirection: 'row', columnGap: 16 }}>
                            <IconButton iconName="save" />
                            <IconButton iconName={{ family: 'material', name: 'search' }} />
                            <IconButton
                                iconName={{ family: 'octicons', name: 'unmute', subIcon: 'close' }}
                            />
                            <IconButton iconName={{ name: 'message', subIcon: 'arrow-right' }} />
                        </View>
                    </View>
                </CollapsableTitle>

                <ThemedButton onPress={() => inputRef.current?.open()} label="Show Sheet" />

                <InputSheet
                    title="Test Input"
                    description="Example description"
                    ref={inputRef}
                    onConfirm={(text) => {
                        console.log(text)
                    }}
                />

                <Text style={{ color: color.text._100 }}>Context menu</Text>
                <Text style={{ color: color.text._300 }}>{menuAction}</Text>
                <Text style={{ color: color.text._300 }}>
                    Test actions, disabled and hidden rows, conditional closing, nested menus and
                    long press.
                </Text>
                <ThemedSwitch
                    label="Show disabled row"
                    value={showDisabledItem}
                    onChangeValue={setShowDisabledItem}
                />
                <ContextMenu placement="bottom">
                    <ContextMenu.Trigger
                        icon="setting"
                        accessibilityLabel="Open new test menu"
                        style={{ padding: 12, alignSelf: 'flex-start' }}
                    />
                    <ContextMenu.Body>
                        <ContextMenu.Button
                            label="Action (closes)"
                            icon="edit"
                            onPress={() => setMenuAction('Automatic close action')}
                        />
                        <ContextMenu.Button
                            label="Disabled action"
                            icon="stop"
                            hidden={!showDisabledItem}
                            disabled
                            onPress={() => setMenuAction('ERROR: disabled action ran')}
                        />
                        <ContextMenu.Button
                            label="Toggle hidden item"
                            closeOnPress={false}
                            onPress={() => setShowHiddenItem((show) => !show)}
                        />
                        <ContextMenu.Button
                            label="Previously hidden item"
                            hidden={!showHiddenItem}
                            onPress={() => setMenuAction('Revealed item pressed')}
                        />
                        <ContextMenu.Divider />
                        <View style={{ padding: 12 }}>
                            <ThemedSwitch
                                label="Keep menu open"
                                value={keepMenuOpen}
                                onChangeValue={setKeepMenuOpen}
                            />
                        </View>
                        <ContextMenu.Button
                            label="Conditional close"
                            closeOnPress={false}
                            onPress={(close) => {
                                setMenuAction(
                                    keepMenuOpen ? 'Kept menu open' : 'Manually closed menu'
                                )
                                if (!keepMenuOpen) close()
                            }}
                        />
                        <ContextMenu.Submenu>
                            <ContextMenu.Trigger label="Export" icon="upload" />
                            <ContextMenu.Body>
                                <ContextMenu.Button
                                    label="JSON"
                                    onPress={() => setMenuAction('Export JSON')}
                                />
                                <ContextMenu.Submenu>
                                    <ContextMenu.Trigger label="More formats" />
                                    <ContextMenu.Body>
                                        <ContextMenu.Button
                                            label="PNG"
                                            onPress={() => setMenuAction('Export PNG')}
                                        />
                                    </ContextMenu.Body>
                                </ContextMenu.Submenu>
                            </ContextMenu.Body>
                        </ContextMenu.Submenu>
                        <ContextMenu.Submenu>
                            <ContextMenu.Trigger label="Another submenu" />
                            <ContextMenu.Body>
                                <ContextMenu.Button
                                    label="Closes sibling submenu"
                                    variant="warning"
                                    onPress={() => setMenuAction('Sibling submenu action')}
                                />
                            </ContextMenu.Body>
                        </ContextMenu.Submenu>
                    </ContextMenu.Body>
                </ContextMenu>
                <ContextMenu placement="top">
                    <ContextMenu.Trigger
                        longPress
                        onPress={() => setMenuAction('Short press on custom trigger')}
                        style={{
                            padding: 12,
                            borderWidth: 1,
                            borderColor: color.neutral._400,
                        }}>
                        <Text style={{ color: color.text._100 }}>
                            Hold to open (custom trigger)
                        </Text>
                    </ContextMenu.Trigger>
                    <ContextMenu.Body>
                        <ContextMenu.Button
                            label="Long-press menu action"
                            onPress={() => setMenuAction('Long-press menu action')}
                        />
                    </ContextMenu.Body>
                </ContextMenu>

                <Accordion label="Test Accordion">
                    <Text style={{ color: 'yellow' }}>TEST TEXT</Text>
                </Accordion>
                <ListEditorSheet
                    title="Editable text list"
                    value={data}
                    onChangeValue={setData}
                    suggestions={['Fantasy', 'Adventure', 'Mystery', 'Science fiction']}
                    keyExtractor={(item) => item}
                    labelExtractor={(item) => item}
                    createItem={(text) => text}
                    commitMode="confirm"
                />
                <ThemedCheckbox
                    label="Test Checkbox"
                    value={checkbox}
                    onChangeValue={setCheckbox}
                />
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
                    keyExtractor={(item) => item.value}
                    data={selectorData}
                    selected={selected}
                    onChangeValue={setSelected}
                    labelExtractor={(item) => item.label}
                />
                <MultiDropdownSheet
                    keyExtractor={(item) => item.value}
                    data={selectorData}
                    selected={selectedM}
                    onChangeValue={setSelectedM}
                    labelExtractor={(item) => item.label}
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default ComponentTestScreen
