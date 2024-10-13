import FadeBackrop from '@components/FadeBackdrop'
import { Style } from '@globals'
import { SetStateAction, useEffect } from 'react'
import { BackHandler, GestureResponderEvent, StyleSheet, View } from 'react-native'
import Animated, { Easing, SlideInRight, SlideOutRight } from 'react-native-reanimated'

import UserList from './UserList'

type UserDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

const UserDrawer: React.FC<UserDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }

    useEffect(() => {
        const backAction = () => {
            if (showModal) {
                setShowModal(false)
                return true
            }
            return false
        }
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    }, [showModal])

    return (
        <View style={styles.absolute}>
            <FadeBackrop handleOverlayClick={handleOverlayClick}>
                <Animated.View
                    style={styles.drawer}
                    entering={SlideInRight.duration(200).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutRight.duration(300).easing(Easing.out(Easing.quad))}>
                    <UserList setShowModal={setShowModal} />
                </Animated.View>
            </FadeBackrop>
        </View>
    )
}

export default UserDrawer

const styles = StyleSheet.create({
    absolute: {
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
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },
})
