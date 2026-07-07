import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import { APIManager, APIManagerValue } from '@lib/engine/API/APIManagerState'
import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

import ConnectionEditor from './ConnectionEditor'

type ConnectionItemProps = {
    item: APIManagerValue
    index: number
    pendingOpen?: number
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ item, index, pendingOpen }) => {
    const { spacing, color } = Theme.useTheme()
    const styles = useStyles()
    const editorRef = useBottomSheetRef()
    const { editValue } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            editValue: state.editValue,
        }))
    )

    useEffect(() => {
        if (index === pendingOpen) editorRef.current?.open()
    }, [editorRef, index, pendingOpen])

    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: color.neutral._200,
        activeColor: color.primary._500,
        active: item.active,
    })

    return (
        <Animated.View style={[styles.longContainer, animatedStyle]}>
            <ConnectionEditor index={index} originalValues={item} ref={editorRef} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ThemedSwitch
                    value={item.active}
                    onChangeValue={(value) => {
                        editValue({ ...item, active: value }, index)
                    }}
                />

                <View style={{ marginLeft: spacing.xl, flex: 1 }}>
                    <Text numberOfLines={1} style={item.active ? styles.name : styles.nameInactive}>
                        {item.friendlyName}
                    </Text>
                    <Text style={item.active ? styles.config : styles.configInactive}>
                        {item.configName}
                    </Text>
                </View>
            </View>
            <ThemedButton
                onPress={() => editorRef.current?.open()}
                variant="tertiary"
                iconName="edit"
                iconSize={24}
                buttonStyle={{ borderWidth: 0 }}
            />
        </Animated.View>
    )
}

export default ConnectionItem

const useStyles = () => {
    const { color, spacing, borderWidth, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        longContainer: {
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.xl,
            flex: 1,
            paddingLeft: spacing.xl,
            paddingRight: spacing.xl,
            paddingVertical: spacing.xl,
        },

        name: {
            fontSize: fontSize.l,
            color: color.text._100,
        },

        nameInactive: {
            fontSize: fontSize.l,
            color: color.text._400,
        },

        config: {
            color: color.text._400,
        },

        configInactive: {
            color: color.text._700,
        },
    })
}
