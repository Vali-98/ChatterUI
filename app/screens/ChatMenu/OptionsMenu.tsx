import { AntDesign, Ionicons } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { Characters, Chats } from '@lib/utils/Global'
import { useRouter } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuOptionsCustomStyle,
    MenuTrigger,
    renderers,
} from 'react-native-popup-menu'

const { SlideInMenu } = renderers

type MenuData = {
    callback: () => void
    text: string
    button: 'back' | 'edit' | 'paperclip'
}

type OptionsMenuProps = {
    menuRef: React.MutableRefObject<Menu | null>
    showChats: (b: boolean) => void
}

const OptionsMenu: React.FC<OptionsMenuProps> = ({ menuRef, showChats }) => {
    const styles = useStyles()
    const menuStyle = useMenuStyle()
    const { color, spacing } = Theme.useTheme()

    const router = useRouter()
    const { unloadCharacter } = Characters.useCharacterCard((state) => ({
        unloadCharacter: state.unloadCard,
    }))

    const { unloadChat } = Chats.useChat()

    const menuoptions: MenuData[] = [
        {
            callback: () => {
                unloadCharacter()
                unloadChat()
            },
            text: 'Main Menu',
            button: 'back',
        },
        {
            callback: () => {
                router.push('/CharacterEditor')
            },
            text: 'Edit Character',
            button: 'edit',
        },
        {
            callback: () => {
                showChats(true)
            },
            text: 'Chat History',
            button: 'paperclip',
        },
    ]

    return (
        <Menu renderer={SlideInMenu} ref={menuRef}>
            <MenuTrigger>
                <Ionicons
                    name="caret-up-circle"
                    style={styles.optionsButton}
                    size={32}
                    color={color.text._400}
                />
            </MenuTrigger>
            <MenuOptions customStyles={menuStyle}>
                {menuoptions.map((item, index) => (
                    <MenuOption key={index} onSelect={item.callback}>
                        <View
                            style={
                                index === menuoptions.length - 1
                                    ? styles.optionItemLast
                                    : styles.optionItem
                            }>
                            <AntDesign
                                style={{ minWidth: 25, marginLeft: spacing.m }}
                                name={item.button}
                                color={color.text._400}
                                size={24}
                            />
                            <Text style={styles.optionText}>{item.text}</Text>
                        </View>
                    </MenuOption>
                ))}
            </MenuOptions>
        </Menu>
    )
}

export default OptionsMenu

const useMenuStyle = () => {
    const { color, spacing } = Theme.useTheme()

    const menuStyle: MenuOptionsCustomStyle = {
        optionsContainer: {
            borderTopWidth: 1,
            borderColor: color.neutral._300,
            backgroundColor: color.neutral._100,
            padding: spacing.sm,
            borderRadius: spacing.m,
        },
    }

    return menuStyle
}

const useStyles = () => {
    const { color, spacing, borderWidth } = Theme.useTheme()

    return StyleSheet.create({
        optionsButton: {
            color: color.primary._500,
        },

        optionItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: spacing.m,
            borderBottomColor: color.neutral._300,
            borderBottomWidth: borderWidth.m,
        },

        optionItemLast: {
            flexDirection: 'row',
            alignItems: 'center',
        },

        optionText: {
            color: color.text._100,
            marginLeft: spacing.xl,
        },
    })
}
