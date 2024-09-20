import { Style } from '@globals'
import { SetStateAction, useEffect } from 'react'
import {
    Text,
    GestureResponderEvent,
    TouchableOpacity,
    StyleSheet,
    View,
    BackHandler,
} from 'react-native'
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutRight,
} from 'react-native-reanimated'

type ChatsDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

const ChatsDrawer: React.FC<ChatsDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }

    if (showModal)
        return (
            <View style={styles.absolute}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(300)}
                    style={styles.absolute}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={handleOverlayClick}
                        style={styles.backdrop}
                    />
                </Animated.View>

                <Animated.View
                    style={styles.drawer}
                    entering={SlideInRight.duration(200).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutRight.duration(300).easing(Easing.out(Easing.quad))}>
                    <Text>Chat History</Text>
                </Animated.View>
            </View>
        )
}

export default ChatsDrawer

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    drawer: {
        backgroundColor: Style.getColor('primary-surface1'),
        width: '80%',
        shadowColor: Style.getColor('primary-shadow'),
        left: '20%',
        borderTopWidth: 3,
        elevation: 20,
        position: 'absolute',
        height: '100%',
        padding: 32,
    },

    userContainer: {
        flexDirection: 'row',
        paddingBottom: 24,
        paddingTop: 40,
        padding: 16,
    },

    buttonContainer: {
        flexDirection: 'row',
        marginLeft: 12,
    },

    button: {
        borderColor: Style.getColor('primary-surface3'),
        borderWidth: 2,
        marginRight: 10,
        borderRadius: 4,
        padding: 8,
    },

    userName: {
        fontSize: 20,
        marginTop: 4,
        marginBottom: 8,
        marginLeft: 12,
        color: Style.getColor('primary-text1'),
    },

    userImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    largeButtonText: {
        fontSize: 18,
        paddingVertical: 12,
        paddingLeft: 15,
        color: Style.getColor('primary-text1'),
    },

    largeButton: {
        paddingLeft: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
})
