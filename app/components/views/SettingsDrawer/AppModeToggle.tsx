import { AntDesign } from '@expo/vector-icons'
import { useAppMode } from '@lib/state/AppMode'
import { Theme } from '@lib/theme/ThemeManager'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const AppModeToggle = () => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { appMode, setAppMode } = useAppMode()
    const localMode = appMode === 'local'
    const remoteMode = appMode === 'remote'

    return (
        <View style={styles.modeContainer}>
            <Text style={styles.appModeText}>App Mode</Text>
            <View style={styles.modeButtonContainer}>
                <TouchableOpacity
                    onPress={() => setAppMode('local')}
                    style={localMode ? styles.modeButton : styles.modeButtonInactive}>
                    <AntDesign
                        name="mobile1"
                        color={localMode ? color.text._100 : color.text._500}
                        size={18}
                    />
                    <Text style={localMode ? styles.modeText : styles.modeTextInactive}>Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setAppMode('remote')}
                    style={remoteMode ? styles.modeButton : styles.modeButtonInactive}>
                    <AntDesign
                        name="cloudo"
                        color={remoteMode ? color.text._100 : color.text._500}
                        size={18}
                    />
                    <Text style={remoteMode ? styles.modeText : styles.modeTextInactive}>
                        Remote
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        largeButtonText: {
            fontSize: fontSize.l,
            paddingVertical: spacing.l,
            paddingLeft: spacing.xl,
            color: color.text._100,
        },

        largeButton: {
            paddingLeft: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
        },

        modeContainer: {
            paddingLeft: spacing.l,
            paddingRight: spacing.xl,
            marginBottom: spacing.m,
        },

        modeButtonContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            columnGap: 4,
        },

        modeButton: {
            flexDirection: 'row',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            columnGap: spacing.m,
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderWidth: borderWidth.m,
            borderRadius: spacing.m,
            borderColor: color.primary._300,
        },

        modeText: {
            color: color.text._100,
        },

        modeButtonInactive: {
            flexDirection: 'row',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            columnGap: spacing.m,
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderWidth: borderWidth.m,
            borderRadius: spacing.m,
            borderColor: color.neutral._200,
        },

        modeTextInactive: {
            color: color.text._400,
        },

        appModeText: {
            marginLeft: spacing.m,
            color: color.text._300,
            marginBottom: spacing.m,
        },
    })
}

export default AppModeToggle
