import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import FadeBackrop from '@components/views/FadeBackdrop'
import { AlertButtonProps, AlertProps, useAlertStore } from '@lib/state/components/Alert'
import { Theme } from '@lib/theme/ThemeManager'

namespace Alert {
    export const alert = (props: AlertProps) => {
        useAlertStore.getState().show(props)
    }
}

export default Alert

const AlertButton: React.FC<AlertButtonProps> = ({ label, onPress, type = 'default' }) => {
    const styles = useStyles()
    const buttonStyleMap = {
        warning: styles.buttonWarning,
        default: styles.button,
    }

    return (
        <TouchableOpacity
            onPress={async () => {
                useAlertStore.getState().hide()
                onPress && onPress()
            }}>
            <Text style={buttonStyleMap[type]}>{label}</Text>
        </TouchableOpacity>
    )
}

export const AlertProvider = () => {
    const styles = useStyles()
    const { visible, props } = useAlertStore(
        useShallow((state) => ({ visible: state.visible, props: state.props }))
    )
    const handleDismiss = () => {
        const dismiss = props.onDismiss
        if (dismiss) {
            dismiss()
        }
        hide()
    }
    const hide = useAlertStore((state) => state.hide)

    return (
        <Modal
            visible={visible}
            transparent
            style={styles.modal}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={handleDismiss}>
            <FadeBackrop handleOverlayClick={handleDismiss} />
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
        </Modal>
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
            paddingHorizontal: spacing.xl2,
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
