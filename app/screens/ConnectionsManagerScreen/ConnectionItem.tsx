import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import IconButton from '@components/buttons/IconButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ListCard, { ListCardSection } from '@components/views/ListCard'
import { Connection, useConnectionStore } from '@lib/engine/API/connectionStore'
import { Theme } from '@lib/theme/ThemeManager'

import ConnectionEditor from './ConnectionEditor'

type ConnectionItemProps = {
    item: Connection
    pendingOpen?: number
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ item, pendingOpen }) => {
    const { spacing } = Theme.useTheme()
    const styles = useStyles()
    const editorRef = useBottomSheetRef()
    const { activeConnectionId, setActiveConnection } = useConnectionStore(
        useShallow((state) => ({
            activeConnectionId: state.activeConnectionId,
            setActiveConnection: state.setActiveConnection,
        }))
    )

    useEffect(() => {
        if (item.id === pendingOpen) editorRef.current?.open()
    }, [editorRef, item.id, pendingOpen])

    const active = item.id === activeConnectionId

    return (
        <ListCard style={{ paddingLeft: spacing.l }} active={active}>
            <ConnectionEditor originalValues={item} ref={editorRef} />
            <ListCardSection style={{ columnGap: spacing.xl, paddingVertical: spacing.xl }}>
                <ThemedSwitch
                    value={active}
                    onChangeValue={(value) => {
                        setActiveConnection(value ? item.id : null)
                    }}
                />
                <View>
                    <Text numberOfLines={1} style={active ? styles.name : styles.nameInactive}>
                        {item.friendlyName}
                    </Text>
                    <Text style={active ? styles.config : styles.configInactive}>
                        {item.configName}
                    </Text>
                </View>
            </ListCardSection>
            <ListCardSection>
                <IconButton
                    onPress={() => editorRef.current?.open()}
                    variant="tertiary"
                    iconName="edit"
                    iconSize={24}
                    viewStyle={{ paddingHorizontal: spacing.l }}
                />
            </ListCardSection>
        </ListCard>
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
