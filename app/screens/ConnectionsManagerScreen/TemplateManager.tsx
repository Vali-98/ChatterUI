import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useTranslation } from 'react-i18next'
import { FlatList, Linking, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { FileUtils } from '@lib/utils/File'

import TemplateItem from './TemplateItem'

const TemplateManager = () => {
    const { templates, addTemplate } = useConnectionStore(
        useShallow((state) => ({
            templates: state.customTemplates,
            addTemplate: state.addTemplate,
        }))
    )
    const pasteInputRef = useBottomSheetRef()
    const { t } = useTranslation()
    const { color, spacing } = Theme.useTheme()

    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                paddingTop: spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <HeaderTitle title={t('connections.templates.title')} />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu placement="bottom">
                        <ContextMenu.Trigger icon="setting" />
                        <ContextMenu.Body>
                            <ContextMenu.Button
                                label={t('connections.templates.import')}
                                icon="download"
                                closeOnPress={false}
                                onPress={async (close) => {
                                    close()
                                    const result = await FileUtils.pickJSON({
                                        type: 'application/json',
                                    })
                                    if (!result.success) {
                                        return
                                    }
                                    addTemplate(result.data)
                                }}
                            />
                            <ContextMenu.Button
                                label={t('connections.templates.paste')}
                                icon="file"
                                closeOnPress={false}
                                onPress={(close) => {
                                    close()
                                    pasteInputRef.current?.open()
                                }}
                            />
                            <ContextMenu.Button
                                label={t('connections.templates.get')}
                                icon="github"
                                closeOnPress={false}
                                onPress={(close) => {
                                    close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/126'
                                    )
                                }}
                            />
                            <ContextMenu.Button
                                label={t('connections.templates.learn')}
                                icon="info"
                                closeOnPress={false}
                                onPress={(close) => {
                                    close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/blob/dev/docs/CustomTemplates.md'
                                    )
                                }}
                            />
                        </ContextMenu.Body>
                    </ContextMenu>
                )}
            />
            <InputSheet
                ref={pasteInputRef}
                onConfirm={(e) => {
                    try {
                        const data = JSON.parse(e)
                        addTemplate(data)
                    } catch (e) {
                        Logger.errorToast(
                            t('connections.templates.importError', {
                                error: String(e),
                            })
                        )
                    }
                }}
                multiline
                title={t('connections.templates.pasteSheetTitle')}
            />
            {templates.length > 0 && (
                <FlatList
                    contentContainerStyle={{ rowGap: 4 }}
                    data={templates}
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => <TemplateItem item={item} />}
                />
            )}

            {templates.length === 0 && (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <AntDesign name="file-unknown" size={64} color={color.text._700} />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        {t('connections.templates.empty')}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    )
}

export default TemplateManager
