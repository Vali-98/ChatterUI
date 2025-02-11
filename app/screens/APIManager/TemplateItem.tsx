import ThemedButton from '@components/buttons/ThemedButton'
import Alert from '@components/views/Alert'
import { APIConfiguration } from '@lib/engine/API/APIBuilder.types'
import { APIState } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'
import { Text, View } from 'react-native'

type TemplateItemProps = {
    item: APIConfiguration
    index: number
}

const TemplateItem: React.FC<TemplateItemProps> = ({ item, index }) => {
    const { color, spacing, borderWidth, fontSize, borderRadius } = Theme.useTheme()

    const { removeTemplate } = APIState.useAPIState((state) => ({
        removeTemplate: state.removeTemplate,
    }))

    const handleDelete = () => {
        Alert.alert({
            title: 'Delete Template',
            description: `Are you sure you want to delete "${item.name}"?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Template',
                    onPress: () => {
                        removeTemplate(index)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleExport = () => {
        saveStringToDownload(JSON.stringify(item), `${item.name}.json`, 'utf8').then(() => {
            Logger.infoToast(`Saved ${item.name}.json To Downloads`)
        })
    }

    return (
        <View
            style={{
                borderColor: color.neutral._300,
                borderWidth: borderWidth.m,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: borderRadius.xl,
                flex: 1,
                paddingLeft: spacing.l,
                paddingRight: spacing.xl2,
                paddingVertical: spacing.xl,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginLeft: spacing.xl }}>
                    <Text style={{ color: color.text._100, fontSize: fontSize.l }}>
                        {item.name}
                    </Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedButton
                    onPress={handleDelete}
                    iconName="delete"
                    iconSize={24}
                    variant="critical"
                    buttonStyle={{ borderWidth: 0 }}
                />
                <ThemedButton
                    onPress={handleExport}
                    iconName="download"
                    iconSize={24}
                    variant="tertiary"
                />
            </View>
        </View>
    )
}

export default TemplateItem
