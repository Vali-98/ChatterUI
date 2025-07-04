import ThemedButton from '@components/buttons/ThemedButton'
import Alert from '@components/views/Alert'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Logger } from '@lib/state/Logger'
import { DefaultColorSchemes, ThemeColor } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'
import { pickJSONDocument } from '@lib/utils/File'
import { setBackgroundColorAsync } from 'expo-system-ui'
import React, { useState } from 'react'
import { Text, TouchableOpacity, View, FlatList, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

type ColorThemeItemProps = {
    item: ThemeColor
    index: number
    showDelete?: boolean
}

const ColorThemeItem: React.FC<ColorThemeItemProps> = ({ item, index, showDelete = false }) => {
    const { color, setColor, customColors, removeColorScheme } = Theme.useColorState(
        useShallow((state) => ({
            color: state.color,
            setColor: state.setColor,
            customColors: state.customColors,
            removeColorScheme: state.removeColorScheme,
        }))
    )

    const handleRemoveColorScheme = (index: number) => {
        Alert.alert({
            title: 'Delete Theme',
            description: `Are you sure you want to delete ${customColors[0]?.name}? This cannot be undone!`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Theme',
                    type: 'warning',
                    onPress: () => {
                        removeColorScheme(index)
                    },
                },
            ],
        })
    }

    return (
        <View
            style={{
                flexDirection: 'row',
                columnGap: 4,
                alignItems: 'center',
            }}>
            <TouchableOpacity
                onPress={() => {
                    setColor(item)
                    setBackgroundColorAsync(item.neutral._100)
                }}
                style={{
                    borderColor: item.text._100,
                    borderWidth: 1,
                    backgroundColor: item.neutral._100,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    columnGap: 8,
                    flex: 1,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}
                key={index}>
                <View
                    style={{
                        alignItems: 'center',
                        columnGap: 16,
                        flexDirection: 'row',
                        marginRight: 16,
                        flex: 1,
                    }}>
                    <View
                        style={{
                            padding: 8,
                            backgroundColor: item.primary._500,
                            borderRadius: 24,
                        }}
                    />
                    <Text
                        style={{ color: item.text._100, flex: 1 }}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {item.name}
                    </Text>
                    {color.name === item.name && (
                        <Text
                            style={{
                                color: item.text._100,
                                borderColor: item.neutral._300,
                                borderWidth: 2,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 8,
                            }}>
                            Active
                        </Text>
                    )}
                </View>
                {showDelete ? (
                    <ThemedButton
                        iconStyle={{ color: color.error._500 }}
                        variant="tertiary"
                        iconSize={20}
                        iconName="delete"
                        onPress={() => {
                            handleRemoveColorScheme(index)
                        }}
                    />
                ) : (
                    <Text style={{ color: item.text._500 }}>
                        {showDelete ? 'Custom' : 'Built-in'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    )
}

const ColorSelector = () => {
    const { customColors, addCustomColor } = Theme.useColorState(
        useShallow((state) => ({
            customColors: state.customColors,
            addCustomColor: state.addCustomColor,
        }))
    )

    const [showPaste, setShowPaste] = useState(false)

    return (
        <SafeAreaView edges={['bottom']} style={{ padding: 16, rowGap: 16 }}>
            <HeaderTitle title="Themes" />
            <HeaderButton
                headerRight={() => (
                    <PopupMenu
                        icon="setting"
                        placement="bottom"
                        options={[
                            {
                                label: 'Import Theme',
                                icon: 'download',
                                onPress: (m) => {
                                    pickJSONDocument().then((result) => {
                                        if (!result.success) return
                                        addCustomColor(result.data)
                                    })
                                    m?.current?.close()
                                },
                            },
                            {
                                label: 'Paste Theme',
                                icon: 'file1',
                                onPress: (m) => {
                                    m.current?.close()
                                    setShowPaste(true)
                                },
                            },
                            {
                                label: 'Get Themes',
                                icon: 'github',
                                onPress: (m) => {
                                    m.current?.close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/218'
                                    )
                                },
                            },
                        ]}
                    />
                )}
            />
            <TextBoxModal
                booleans={[showPaste, setShowPaste]}
                onConfirm={(e) => {
                    try {
                        const data = JSON.parse(e)
                        addCustomColor(data)
                    } catch (e) {
                        Logger.errorToast('Failed to import: ' + e)
                    }
                }}
                multiline
                showPaste
                title="Paste Theme Here"
            />
            <FlatList
                contentContainerStyle={{ rowGap: 8 }}
                data={[...DefaultColorSchemes.schemes, ...customColors]}
                keyExtractor={(item, index) => item.name}
                renderItem={({ item, index }) => (
                    <ColorThemeItem
                        item={item}
                        index={index - DefaultColorSchemes.schemes.length}
                        showDelete={index >= DefaultColorSchemes.schemes.length}
                    />
                )}
            />
        </SafeAreaView>
    )
}

export default ColorSelector
