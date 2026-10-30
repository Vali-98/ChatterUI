import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import { EdgeFadeFlatList } from '@components/views/EdgeFade'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { IconSizes } from '@lib/constants/IconSizes'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { Theme } from '@lib/theme/ThemeManager'

import ConnectionItem from './ConnectionItem'
import TemplatePicker from './TemplatePicker'

const ConnectionsManagerScreen = () => {
    const { t } = useTranslation()
    const { apiValues, updatePreferences, isCustomFieldsEnabled } = useConnectionStore(
        useShallow((state) => ({
            apiValues: state.connections,
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
                    <ContextMenu placement="bottom">
                        <ContextMenu.Trigger icon="setting" />
                        <ContextMenu.Body>
                            <ContextMenu.Button
                                icon="file"
                                label={t('connections.options.manageTemplates')}
                                onPress={() => {
                                    router.push('/connections/templates')
                                }}
                            />
                            <ContextMenu.Button
                                icon="file-text"
                                label={
                                    isCustomFieldsEnabled
                                        ? t('connections.options.disableCustomFields')
                                        : t('connections.options.enableCustomFields')
                                }
                                closeOnPress={false}
                                onPress={() =>
                                    updatePreferences({ showCustomFields: !isCustomFieldsEnabled })
                                }
                            />
                        </ContextMenu.Body>
                    </ContextMenu>
                )}
            />
            {apiValues.length > 0 && (
                <EdgeFadeFlatList
                    containerStyle={{ flex: 1 }}
                    style={{
                        paddingHorizontal: spacing.xl,
                    }}
                    contentContainerStyle={{ rowGap: 4, paddingBottom: 24 }}
                    data={apiValues}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <ConnectionItem item={item} pendingOpen={pendingOpen} />
                    )}
                    removeClippedSubviews={false}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {apiValues.length === 0 && (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons
                        name="cloud-off"
                        size={IconSizes.empty}
                        color={color.text._700}
                    />
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
                viewStyle={{
                    marginHorizontal: spacing.xl,
                }}
                onPress={() => {
                    templatePickerRef.current?.open()
                }}
                label={t('connections.manager.add')}
                variant="primary"
                level="primary"
            />
            <TemplatePicker ref={templatePickerRef} setPending={setPendingOpen} />
        </SafeAreaView>
    )
}

export default ConnectionsManagerScreen
