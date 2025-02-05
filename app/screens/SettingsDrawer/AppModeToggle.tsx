import { AntDesign } from '@expo/vector-icons'
import { AppMode, Global } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const AppModeToggle = () => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const [appMode, setAppMode] = useMMKVString(Global.AppMode)
    const localMode = appMode === AppMode.LOCAL
    const remoteMode = appMode === AppMode.REMOTE

    return (
        <View style={styles.modeContainer}>
            <Text style={styles.appModeText}>App Mode</Text>
            <View style={styles.modeButtonContainer}>
                <TouchableOpacity
                    onPress={() => setAppMode(AppMode.LOCAL)}
                    style={localMode ? styles.modeButton : styles.modeButtonInactive}>
                    <AntDesign
                        name="mobile1"
                        color={localMode ? color.text._100 : color.text._700}
                        size={18}
                    />
                    <Text style={localMode ? styles.modeText : styles.modeTextInactive}>Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setAppMode(AppMode.REMOTE)}
                    style={remoteMode ? styles.modeButton : styles.modeButtonInactive}>
                    <AntDesign
                        name="cloudo"
                        color={remoteMode ? color.text._100 : color.text._700}
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
            borderColor: color.neutral._300,
        },

        modeTextInactive: {
            color: color.text._500,
        },

        appModeText: {
            marginLeft: spacing.m,
            color: color.text._400,
            marginBottom: spacing.m,
        },
    })
}

export default AppModeToggle
