import { AntDesign, Ionicons } from '@expo/vector-icons'
import { Characters, Chats, Style } from '@globals'
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
    const router = useRouter()
    const { unloadCharacter } = Characters.useCharacterCard((state) => ({
        unloadCharacter: state.unloadCard,
    }))

    const unloadChat = Chats.useChat((state) => state.reset)

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
                router.push('/CharInfo')
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
                    name="ellipsis-vertical-circle"
                    style={styles.optionsButton}
                    size={32}
                    color={Style.getColor('primary-text2')}
                />
            </MenuTrigger>
            <MenuOptions customStyles={menustyle}>
                {menuoptions.map((item, index) => (
                    <MenuOption key={index} onSelect={item.callback}>
                        <View
                            style={
                                index === menuoptions.length - 1
                                    ? styles.optionItemLast
                                    : styles.optionItem
                            }>
                            <AntDesign
                                style={{ minWidth: 25, marginLeft: 5 }}
                                name={item.button}
                                color={Style.getColor('primary-text2')}
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

const styles = StyleSheet.create({
    optionsButton: {
        paddingBottom: 6,
    },

    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomColor: Style.getColor('primary-surface3'),
        borderBottomWidth: 1,
    },

    optionItemLast: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    optionText: {
        color: Style.getColor('primary-text1'),
        marginLeft: 16,
    },
})

const menustyle: MenuOptionsCustomStyle = {
    optionsContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        padding: 4,
        borderRadius: 8,
    },
}
