import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, BackHandler } from 'react-native'
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuOptionsCustomStyle,
    MenuTrigger,
    renderers,
} from 'react-native-popup-menu'
import Animated, { Easing, SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

const { Popover } = renderers

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
    getCharacterList: () => Promise<void>
}

type PopupProps = {
    onPress: () => void | Promise<void>
    label: string
    iconName: 'pencil' | 'cloud-download' | 'upload'
}

const PopupOption: React.FC<PopupProps> = ({ onPress, label, iconName }) => {
    return (
        <MenuOption>
            <TouchableOpacity style={styles.popupButton} onPress={onPress}>
                <FontAwesome name={iconName} size={28} color={Style.getColor('primary-text2')} />
                <Text style={styles.optionLabel}>{label}</Text>
            </TouchableOpacity>
        </MenuOption>
    )
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({
    nowLoading,
    setNowLoading,
    getCharacterList,
}) => {
    const menuRef: React.MutableRefObject<Menu | null> = useRef(null)

    useEffect(() => {
        const backAction = () => {
            if (!menuRef || !menuRef.current?.isOpen()) return false
            menuRef.current?.close()
            return true
        }
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    }, [])

    const { setCurrentCard } = Characters.useCharacterCard(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
            id: state.id,
        }))
    )
    const loadChat = Chats.useChat((state) => state.load)

    const router = useRouter()
    const [showNewChar, setShowNewChar] = useState<boolean>(false)
    const [showDownload, setShowDownload] = useState(false)

    const setCurrentCharacter = async (charId: number, edit: boolean = false) => {
        if (nowLoading) return

        try {
            await setCurrentCard(charId)
            setNowLoading(true)
            const returnedChatId = await Chats.db.query.chatNewest(charId)
            let chatId = returnedChatId
            if (!chatId) {
                chatId = await Chats.db.mutate.createChat(charId)
            }
            if (!chatId) {
                Logger.log('Chat creation backup has failed! Please report.', true)
                return
            }

            await loadChat(chatId)

            setNowLoading(false)
            if (edit) router.push('/CharInfo')
            else router.back()
        } catch (error) {
            Logger.log(`Couldn't load character: ${error}`, true)
            setNowLoading(false)
        }
    }

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.log('Name Cannot Be Empty!', true)
            return
        }
        Characters.db.mutate.createCard(text).then(async (id) => {
            await setCurrentCharacter(id, true)
        })
    }

    return (
        <Animated.View
            style={styles.headerButtonContainer}
            entering={SlideInRight.easing(Easing.out(Easing.ease)).duration(300)}
            exiting={SlideOutRight.duration(500).easing(Easing.out(Easing.ease))}>
            <TextBoxModal
                booleans={[showNewChar, setShowNewChar]}
                title="Create New Character"
                onConfirm={handleCreateCharacter}
                placeholder="Name..."
            />

            <TextBoxModal
                title="Enter Character Hub or Pygmalion Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) =>
                    Characters.importCharacterFromRemote(text).then(() => {
                        getCharacterList()
                    })
                }
                showPaste
            />

            <Menu
                ref={menuRef}
                renderer={Popover}
                rendererProps={{ placement: 'bottom', anchorStyle: styles.anchor }}>
                <MenuTrigger>
                    <FontAwesome name="plus" size={28} color={Style.getColor('primary-text1')} />
                </MenuTrigger>
                <MenuOptions customStyles={menustyle}>
                    <PopupOption
                        onPress={() => {
                            menuRef.current?.close()
                            setShowDownload(true)
                        }}
                        iconName="cloud-download"
                        label="Download"
                    />
                    <PopupOption
                        onPress={() => {
                            menuRef.current?.close()
                            Characters.importCharacterFromImage().then(async () => {
                                getCharacterList()
                            })
                        }}
                        iconName="upload"
                        label="Import From File"
                    />
                    <PopupOption
                        onPress={() => {
                            menuRef.current?.close()
                            setShowNewChar(true)
                        }}
                        iconName="pencil"
                        label="Create Character"
                    />
                </MenuOptions>
            </Menu>
        </Animated.View>
    )
}

export default CharacterNewMenu

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
