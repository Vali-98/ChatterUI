import TextBoxModal from '@components/TextBoxModal'
import { Llama } from '@constants/LlamaLocal'
import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import { useFocusEffect } from 'expo-router'
import { useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, BackHandler, View } from 'react-native'
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuOptionsCustomStyle,
    MenuTrigger,
    renderers,
} from 'react-native-popup-menu'
import Animated, { ZoomIn } from 'react-native-reanimated'

const { Popover } = renderers

type ModelNewMenuProps = {
    modelImporting: boolean
    setModelImporting: (b: boolean) => void
}

type PopupProps = {
    onPress: () => void | Promise<void>
    label: string
    iconName: keyof typeof AntDesign.glyphMap
}

const PopupOption: React.FC<PopupProps> = ({ onPress, label, iconName }) => {
    return (
        <MenuOption>
            <TouchableOpacity style={styles.popupButton} onPress={onPress}>
                <AntDesign name={iconName} size={28} color={Style.getColor('primary-text2')} />
                <Text style={styles.optionLabel}>{label}</Text>
            </TouchableOpacity>
        </MenuOption>
    )
}

const ModelNewMenu: React.FC<ModelNewMenuProps> = ({ modelImporting, setModelImporting }) => {
    const menuRef: React.MutableRefObject<Menu | null> = useRef(null)
    const [showMenu, setShowMenu] = useState(false)
    const backAction = () => {
        if (!menuRef.current || !menuRef.current?.isOpen()) return false
        menuRef.current?.close()
        return true
    }

    useFocusEffect(() => {
        BackHandler.removeEventListener('hardwareBackPress', backAction)
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    })

    const [showDownload, setShowDownload] = useState(false)

    const handleDownloadModel = (text: string) => {}

    const handleSetExternal = () => {}

    return (
        <View>
            <TextBoxModal
                title="Enter Character Hub or Pygmalion Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) => handleDownloadModel(text)}
                showPaste
            />

            <Menu
                onOpen={() => setShowMenu(true)}
                onClose={() => setShowMenu(false)}
                ref={menuRef}
                renderer={Popover}
                rendererProps={{ placement: 'bottom', anchorStyle: styles.anchor }}>
                <MenuTrigger>
                    <View>
                        <Animated.View style={styles.headerButtonContainer} entering={ZoomIn}>
                            <AntDesign
                                name="addfile"
                                size={28}
                                color={Style.getColor(showMenu ? 'primary-text2' : 'primary-text1')}
                            />
                        </Animated.View>
                    </View>
                </MenuTrigger>
                <MenuOptions customStyles={menustyle}>
                    {/*<PopupOption
                        onPress={() => {
                            menuRef.current?.close()
                        }}
                        iconName="clouddownload"
                        label="Download From URL"
                    />*/}
                    <PopupOption
                        onPress={async () => {
                            menuRef.current?.close()
                            if (modelImporting) return
                            setModelImporting(true)
                            await Llama.importModel()
                            setModelImporting(false)
                        }}
                        iconName="download"
                        label="Copy Model Into ChatterUI"
                    />
                    <PopupOption
                        onPress={async () => {
                            menuRef.current?.close()
                            if (modelImporting) return
                            setModelImporting(true)
                            await Llama.linkModelExternal()
                            setModelImporting(false)
                        }}
                        iconName="link"
                        label="Use External Model"
                    />
                </MenuOptions>
            </Menu>
        </View>
    )
}

export default ModelNewMenu

const styles = StyleSheet.create({
    anchor: {
        backgroundColor: Style.getColor('primary-surface3'),
        padding: 8,
    },

    popupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        paddingVertical: 12,
        paddingRight: 24,
        paddingLeft: 12,
        borderRadius: 12,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },

    optionLabel: {
        fontSize: 16,
        fontWeight: '400',
        color: Style.getColor('primary-text1'),
    },
})

const menustyle: MenuOptionsCustomStyle = {
    optionsContainer: {
        backgroundColor: Style.getColor('primary-surface3'),
        padding: 4,
        borderRadius: 12,
    },
    optionsWrapper: {
        backgroundColor: Style.getColor('primary-surface3'),
    },
}
