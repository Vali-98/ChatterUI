import FadeBackrop from '@components/views/FadeBackdrop'
import { Theme } from '@lib/theme/ThemeManager'
import React, { ReactNode } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { create } from 'zustand'

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
    onDismiss?: () => void
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
    const styles = useStyles()
    const buttonStyleMap = {
        warning: styles.buttonWarning,
        default: styles.button,
    }

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
    const styles = useStyles()
    const { visible, props } = useAlert((state) => ({ visible: state.visible, props: state.props }))
    const handleDismiss = () => {
        const dismiss = props.onDismiss
        if (dismiss) {
            dismiss()
        }
    }
    const hide = useAlert((state) => state.hide)
    return (
        <Modal
            visible={visible}
            transparent
            style={styles.modal}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
                handleDismiss()
                hide()
            }}>
            <FadeBackrop
                handleOverlayClick={() => {
                    handleDismiss()
                    hide()
                }}>
                <Animated.View style={styles.textBoxContainer} entering={FadeInDown.duration(150)}>
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

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        modal: {
            flex: 1,
        },
        textBoxContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },

        textBox: {
            backgroundColor: color.neutral._200,
            paddingHorizontal: spacing.xl3,
            paddingBottom: spacing.xl,
            paddingTop: spacing.xl2,
            borderRadius: borderRadius.xl,
            width: '90%',
        },

        title: {
            color: color.text._100,
            fontSize: 20,
            fontWeight: '500',
            marginBottom: spacing.l,
        },

        description: {
            color: color.text._100,
            marginBottom: spacing.l,
            fontSize: spacing.xl,
        },

        buttonContainer: {
            flexDirection: 'row',
            columnGap: spacing.xl2,
            justifyContent: 'flex-end',
            alignItems: 'center',
        },

        button: {
            paddingHorizontal: spacing.s,
            paddingVertical: spacing.m,
            color: color.text._400,
        },

        buttonWarning: {
            paddingHorizontal: spacing.s,
            paddingVertical: spacing.m,
            color: color.error._300,
        },
    })
}
