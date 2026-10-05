import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ListButton, { ListButtonSection } from '@components/buttons/ListButton'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import { APIManager, APIManagerValue } from '@lib/engine/API/APIManagerState'
import { Theme } from '@lib/theme/ThemeManager'

import ConnectionEditor from './ConnectionEditor'

type ConnectionItemProps = {
    item: APIManagerValue
    index: number
    pendingOpen?: number
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ item, index, pendingOpen }) => {
    const { spacing } = Theme.useTheme()
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

    return (
        <ListButton style={{ paddingLeft: spacing.l }}>
            <ConnectionEditor index={index} originalValues={item} ref={editorRef} />
            <ListButtonSection style={{ columnGap: spacing.xl, paddingVertical: spacing.xl }}>
                <ThemedSwitch
                    value={item.active}
                    onChangeValue={(value) => {
                        editValue({ ...item, active: value }, index)
                    }}
                />
                <View>
                    <Text numberOfLines={1} style={item.active ? styles.name : styles.nameInactive}>
                        {item.friendlyName}
                    </Text>
                    <Text style={item.active ? styles.config : styles.configInactive}>
                        {item.configName}
                    </Text>
                </View>
            </ListButtonSection>
            <ListButtonSection>
                <ThemedButton
                    onPress={() => editorRef.current?.open()}
                    variant="tertiary"
                    iconName="edit"
                    iconSize={24}
                    buttonStyle={{ height: '100%', paddingHorizontal: spacing.l }}
                />
            </ListButtonSection>
        </ListButton>
    )
}

export default ConnectionItem

const useStyles = () => {
    const { color, fontSize } = Theme.useTheme()
    return StyleSheet.create({
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
