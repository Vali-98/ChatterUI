import { Style } from 'constants/Global'
import React, { ReactNode } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { create } from 'zustand'

import FadeBackrop from './FadeBackdrop'

type AlertButtonProps = {
    label: string
    onPress?: () => void | Promise<void>
    type?: 'warning' | 'default'
}

type AlertProps = {
    title: string
    description: string
    buttons: AlertButtonProps[]
    alignButtons?: 'left' | 'right'
}

type AlertState = {
    visible: boolean
    props: AlertProps
    hide: () => void
    show: (props: AlertProps) => void
}

namespace Alert {
    export const alert = (props: AlertProps) => {
        useAlert.getState().show(props)
    }
}

export default Alert

const useAlert = create<AlertState>()((set, get) => ({
    visible: false,
    props: {
        title: 'Are You Sure?',
        description: 'LIke `sure` sure?',
        buttons: [
            { label: 'Cancel', onPress: () => {}, type: 'default' },
            { label: 'Confirm', onPress: () => {}, type: 'warning' },
        ],
        alignButtons: 'right',
    },
    hide: () => {
        set((state) => ({ ...state, visible: false }))
    },
    show: (props: AlertProps) => {
        set((state) => ({ ...state, visible: true, props: props }))
    },
}))

type AlertProviderProps = {
    children: ReactNode
}

const AlertButton: React.FC<AlertButtonProps> = ({ label, onPress, type = 'default' }) => {
    return (
        <TouchableOpacity
            onPress={async () => {
                useAlert.getState().hide()
                onPress && onPress()
            }}>
            <Text style={buttonStyleMap[type]}>{label}</Text>
        </TouchableOpacity>
    )
}

export const AlertBox = () => {
    const { visible, props } = useAlert((state) => ({ visible: state.visible, props: state.props }))

    return (
        <View>
            <Modal
                visible={visible}
                transparent
                style={styles.modal}
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => useAlert.getState().hide()}>
                <FadeBackrop handleOverlayClick={() => useAlert.getState().hide()}>
                    <Animated.View
                        style={styles.textBoxContainer}
                        entering={FadeInDown.duration(150)}>
                        <View style={styles.textBox}>
                            <Text style={styles.title}>{props.title}</Text>
                            <Text style={styles.description}>{props.description}</Text>
                            <View style={styles.buttonContainer}>
                                {props.buttons.map((item, index) => (
                                    <AlertButton {...item} key={index} />
                                ))}
                            </View>
                        </View>
                    </Animated.View>
                </FadeBackrop>
            </Modal>
        </View>
    )
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
    return (
        <View style={{ flex: 1 }}>
            <AlertBox />
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    modal: {
        flex: 1,
    },
    textBoxContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    textBox: {
        backgroundColor: Style.getColor('primary-surface2'),
        paddingHorizontal: 32,
        paddingBottom: 16,
        paddingTop: 24,
        borderRadius: 16,
        width: '90%',
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 12,
    },

    description: {
        color: Style.getColor('primary-text1'),
        marginBottom: 12,
        fontSize: 16,
    },

    buttonContainer: {
        flexDirection: 'row',
        columnGap: 24,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },

    button: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        color: Style.getColor('primary-text2'),
    },

    buttonWarning: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        color: '#d2574b',
    },
})

const buttonStyleMap = {
    warning: styles.buttonWarning,
    default: styles.button,
}
