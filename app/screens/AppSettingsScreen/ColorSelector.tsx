import { Octicons } from '@expo/vector-icons'
import { setBackgroundColorAsync } from 'expo-system-ui'
import React, { useState } from 'react'
import { FlatList, Linking, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { Logger } from '@lib/state/Logger'
import { DefaultColorSchemes, ThemeColor } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'
import { pickJSONDocument } from '@lib/utils/File'

type ColorThemeItemProps = {
    item: ThemeColor
    index: number
    showDelete?: boolean
}

const ColorThemeItem: React.FC<ColorThemeItemProps> = ({ item, index, showDelete = false }) => {
    const {
        systemDark,
        removeColorScheme,
        color,
        darkColor,
        lightColor,
        setColor,
        setDarkColor,
        setLightColor,
    } = Theme.useColorState(
        useShallow((state) => ({
            systemDark: state.useSystemDarkMode,
            color: state.color,
            lightColor: state.lightColor,
            darkColor: state.darkColor,
            setColor: state.setColor,
            setLightColor: state.setLightColor,
            setDarkColor: state.setDarkColor,
            removeColorScheme: state.removeColorScheme,
        }))
    )
    const systemTheme = useColorScheme()
    const activeColor = systemDark ? (systemTheme === 'dark' ? darkColor : lightColor) : color

    const handleRemoveColorScheme = (index: number) => {
        Alert.alert({
            title: 'Delete Theme',
            description: `Are you sure you want to delete "${item.name}"? This cannot be undone!`,
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
                alignItems: 'stretch',
            }}>
            <TouchableOpacity
                disabled={systemDark}
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
                    <Text style={{ color: item.text._100, flex: 1 }} ellipsizeMode="tail">
                        {item.name}
                    </Text>
                    {!systemDark && item.name === color.name && (
                        <Text
                            style={{
                                color: item.text._100,
                                borderColor: item.neutral._300,
                                borderWidth: 2,
                                paddingHorizontal: 8,
                                borderRadius: 8,
                            }}>
                            Active
                        </Text>
                    )}
                </View>
                {showDelete ? (
                    <ThemedButton
                        iconStyle={{ color: item.error._500 }}
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
            {systemDark && (
                <>
                    <TouchableOpacity
                        style={{
                            borderColor: activeColor.text._100,
                            borderWidth: 1,
                            backgroundColor: activeColor.neutral._100,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            justifyContent: 'center',
                        }}
                        onPress={() => {
                            setLightColor(item)
                            if (systemTheme === 'light') setBackgroundColorAsync(item.neutral._100)
                        }}>
                        <Octicons
                            color={
                                item.name === lightColor.name
                                    ? activeColor.text._100
                                    : activeColor.text._700
                            }
                            name="sun"
                            icon
                            size={17}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            borderColor: activeColor.text._100,
                            borderWidth: 1,
                            backgroundColor: activeColor.neutral._100,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            justifyContent: 'center',
                        }}
                        onPress={() => {
                            setDarkColor(item)
                            if (systemTheme === 'light') setBackgroundColorAsync(item.neutral._100)
                        }}>
                        <Octicons
                            color={
                                item.name === darkColor.name
                                    ? activeColor.text._100
                                    : activeColor.text._700
                            }
                            name="moon"
                            icon
                            size={18}
                        />
                    </TouchableOpacity>
                </>
            )}
        </View>
    )
}

const ColorSelector = () => {
    const { systemDark, setSystemDark, customColors, addCustomColor } = Theme.useColorState(
        useShallow((state) => ({
            // system
            systemDark: state.useSystemDarkMode,
            setSystemDark: state.setUseSystemDarkMode,
            // custom color
            customColors: state.customColors,
            addCustomColor: state.addCustomColor,
        }))
    )

    const [showPaste, setShowPaste] = useState(false)

    return (
        <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: 16, rowGap: 16, flex: 1 }}>
            <HeaderTitle title="Themes" />
            <ThemedSwitch
                value={systemDark}
                onChangeValue={setSystemDark}
                label="Use System Dark Mode"
            />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu
                        triggerIcon="setting"
                        placement="bottom"
                        buttons={[
                            {
                                label: 'Import Theme',
                                icon: 'download',
                                onPress: (close) => {
                                    pickJSONDocument().then((result) => {
                                        if (!result.success) return
                                        addCustomColor(result.data)
                                    })
                                    close()
                                },
                            },
                            {
                                label: 'Paste Theme',
                                icon: 'file',
                                onPress: (close) => {
                                    close()
                                    setShowPaste(true)
                                },
                            },
                            {
                                label: 'Get Themes',
                                icon: 'github',
                                onPress: (close) => {
                                    close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/218'
                                    )
                                },
                            },
                        ]}
                    />
                )}
            />
            <InputSheet
                visible={showPaste}
                setVisible={setShowPaste}
                onConfirm={(e) => {
                    try {
                        const data = JSON.parse(e)
                        addCustomColor(data)
                    } catch (e) {
                        Logger.errorToast('Failed to import: ' + e)
                    }
                }}
                multiline
                title="Paste Theme Here"
            />

            <FlatList
                style={{ flex: 1 }}
                contentContainerStyle={{ rowGap: 8 }}
                data={[...DefaultColorSchemes.schemes, ...customColors]}
                keyExtractor={(item) => item.name}
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
