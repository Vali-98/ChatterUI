import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import ContextMenu from '@components/views/ContextMenu'
import Drawer from '@components/views/Drawer'
import { Theme } from '@lib/theme/ThemeManager'

import ChatTokenCount from './ChatTokenCount'

type ChatOptionsProps = {
    disabled: boolean
}

const ChatOptions: React.FC<ChatOptionsProps> = ({ disabled }) => {
    const { t } = useTranslation()
    const router = useRouter()
    const styles = useStyles()

    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowChat = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    return (
        <ContextMenu
            disabled={disabled}
            buttons={[
                {
                    component: () => <ChatTokenCount />,
                    border: true,
                },
                {
                    onPress: (close) => {
                        close()
                        router.back()
                    },
                    label: t('chat.input.actions.mainMenu'),
                    icon: 'backward',
                },
                {
                    onPress: (close) => {
                        close()
                        router.push('/screens/CharacterEditorScreen')
                    },
                    label: t('chat.input.actions.editCharacter'),
                    icon: 'edit',
                },
                {
                    onPress: (close) => {
                        setShowChat(true)
                        close()
                    },
                    label: t('chat.input.actions.chatHistory'),
                    icon: 'paper-clip',
                },
            ]}
            placement="top">
            <Ionicons
                name="caret-up"
                style={[styles.optionsButton, { opacity: disabled ? 0.5 : 1 }]}
                size={24}
            />
        </ContextMenu>
    )
}

export default ChatOptions

const useStyles = () => {
    const { color } = Theme.useTheme()

    return StyleSheet.create({
        optionsButton: {
            color: color.text._500,
            padding: 4,
            backgroundColor: color.neutral._200,
            borderRadius: 16,
        },
    })
}
