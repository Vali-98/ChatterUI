import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, { Easing, SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
    getCharacterList: () => Promise<void>
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({
    nowLoading,
    setNowLoading,
    getCharacterList,
}) => {
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
            collapsable={false}
            entering={SlideInRight.withInitialValues({ originX: 150 })
                .easing(Easing.out(Easing.ease))
                .duration(300)}
            exiting={SlideOutRight.duration(500).easing(Easing.out(Easing.linear))}>
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
            <TouchableOpacity
                style={styles.headerButtonRight}
                onPress={async () => {
                    setShowDownload(true)
                }}>
                <FontAwesome
                    name="cloud-download"
                    size={28}
                    color={Style.getColor('primary-text1')}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.headerButtonRight}
                onPress={() =>
                    Characters.importCharacterFromImage().then(async () => {
                        getCharacterList()
                    })
                }>
                <FontAwesome name="upload" size={28} color={Style.getColor('primary-text1')} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.headerButtonRight}
                onPress={async () => {
                    setShowNewChar(true)
                }}>
                <FontAwesome name="pencil" size={28} color={Style.getColor('primary-text1')} />
            </TouchableOpacity>
        </Animated.View>
    )
}

export default CharacterNewMenu

const styles = StyleSheet.create({
    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },
})
