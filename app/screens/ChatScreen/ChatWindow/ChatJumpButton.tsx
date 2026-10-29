import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import { useChatControlLayoutState } from '@lib/state/components/ChatControls'
import { Theme } from '@lib/theme/ThemeManager'

const ChatJumpButton: React.FC<{ jump: () => void; visible: boolean }> = ({ jump, visible }) => {
    const { color } = Theme.useTheme()

    const chatInputHeight = useChatControlLayoutState((state) => state.inputHeight)
    if (!visible) return
    return (
        <Animated.View entering={FadeInDown}>
            <View style={{ position: 'absolute', bottom: chatInputHeight + 12, right: '50%' }}>
                <IconButton
                    iconName="caret-down"
                    iconSize={16}
                    onPress={jump}
                    iconStyle={{ color: color.text._300 }}
                    viewStyle={{
                        left: 16,
                        borderRadius: 32,
                        backgroundColor: color.neutral._100,
                        borderWidth: 2,
                        borderColor: color.primary._300,
                        paddingHorizontal: 8,
                        paddingVertical: 8,
                    }}
                />
            </View>
        </Animated.View>
    )
}

export default ChatJumpButton
