import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Theme } from '@lib/theme/ThemeManager'

import ConnectionItem from './ConnectionItem'
import TemplatePicker from './TemplatePicker'

const ConnectionsManagerScreen = () => {
    const { t } = useTranslation()
    const { apiValues, updatePreferences, isCustomFieldsEnabled } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            apiValues: state.values,
            isCustomFieldsEnabled: state.preferences?.showCustomFields,
            updatePreferences: state.updatePreferences,
        }))
    )
    const { color, spacing } = Theme.useTheme()
    const [pendingOpen, setPendingOpen] = useState<undefined | number>()
    const templatePickerRef = useBottomSheetRef()

    const router = useRouter()
    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                paddingTop: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <HeaderTitle title={t('connections.manager.header')} />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu
                        placement="bottom"
                        triggerIcon="setting"
                        buttons={[
                            {
                                icon: 'file',

                                label: t('connections.options.manageTemplates'),
                                onPress: (close) => {
                                    router.push('/screens/ConnectionsManagerScreen/TemplateManager')

                                    close()
                                },
                            },
                            {
                                icon: 'file-text',

                                label: isCustomFieldsEnabled
                                    ? t('connections.options.disableCustomFields')
                                    : t('connections.options.enableCustomFields'),
                                onPress: (close) =>
                                    updatePreferences({ showCustomFields: !isCustomFieldsEnabled }),
                            },
                        ]}
                    />
                )}
            />
            {apiValues.length > 0 && (
                <FlatList
                    style={{
                        paddingHorizontal: spacing.xl,
                    }}
                    contentContainerStyle={{ rowGap: 4, paddingBottom: 24 }}
                    data={apiValues}
                    keyExtractor={(item, index) => item.configName + index}
                    renderItem={({ item, index }) => (
                        <ConnectionItem item={item} index={index} pendingOpen={pendingOpen} />
                    )}
                    removeClippedSubviews={false}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {apiValues.length === 0 && (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="cloud-off" size={64} color={color.text._700} />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        {t('connections.manager.empty')}
                    </Text>
                </View>
            )}

            <ThemedButton
                buttonStyle={{
                    marginHorizontal: spacing.xl,
                }}
                onPress={() => {
                    templatePickerRef.current?.open()
                }}
                label={t('connections.manager.add')}
            />
            <TemplatePicker ref={templatePickerRef} setPending={setPendingOpen} />
        </SafeAreaView>
    )
}

export default ConnectionsManagerScreen
