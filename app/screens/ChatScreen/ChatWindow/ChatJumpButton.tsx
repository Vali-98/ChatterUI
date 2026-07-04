import AntDesign from '@react-native-vector-icons/ant-design/static'
import { Pressable } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import { Theme } from '@lib/theme/ThemeManager'

import { useInputHeightStore } from '../ChatInput'

const ChatJumpButton: React.FC<{ jump: () => void; visible: boolean }> = ({ jump, visible }) => {
    const { color } = Theme.useTheme()

    const chatInputHeight = useInputHeightStore(useShallow((state) => state.height))
    if (!visible) return
    return (
        <Animated.View entering={FadeInDown}>
            <Pressable
                style={{ position: 'absolute', bottom: chatInputHeight + 12, right: '50%' }}
                onPress={jump}>
                <AntDesign
                    name="caret-down"
                    size={16}
                    style={{
                        left: 16,
                        borderRadius: 32,
                        color: color.text._300,
                        backgroundColor: color.neutral._100,
                        borderWidth: 2,
                        borderColor: color.primary._300,
                        padding: 8,
                    }}
                />
            </Pressable>
        </Animated.View>
    )
}

export default ChatJumpButton
