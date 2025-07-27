import Drawer from '@components/views/Drawer'
import PopupMenu from '@components/views/PopupMenu'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'

const ChatOptions = () => {
    const router = useRouter()
    const styles = useStyles()

    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowChat = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    return (
        <PopupMenu
            options={[
                {
                    onPress: (m) => {
                        m.current?.close()
                        router.back()
                    },
                    label: 'Main Menu',
                    icon: 'back',
                },
                {
                    onPress: (m) => {
                        m.current?.close()
                        router.push('/screens/CharacterEditorScreen')
                    },
                    label: 'Edit Character',
                    icon: 'edit',
                },
                {
                    onPress: (m) => {
                        setShowChat(true)
                        m.current?.close()
                    },
                    label: 'Chat History',
                    icon: 'paperclip',
                },
            ]}
            placement="top">
            <Ionicons name="caret-up" style={styles.optionsButton} size={24} />
        </PopupMenu>
    )
}

export default ChatOptions

const useStyles = () => {
    const { color, spacing, borderWidth } = Theme.useTheme()

    return StyleSheet.create({
        optionsButton: {
            color: color.text._500,
            padding: 4,
            backgroundColor: color.neutral._200,
            borderRadius: 16,
        },
    })
}
