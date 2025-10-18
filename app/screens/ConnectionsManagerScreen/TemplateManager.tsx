import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { FlatList, Linking, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { pickJSONDocument } from '@lib/utils/File'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import TemplateItem from './TemplateItem'

const TemplateManager = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { templates, addTemplate } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            templates: state.customTemplates,
            addTemplate: state.addTemplate,
        }))
    )
    const [showPaste, setShowPaste] = useState(false)
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
            <HeaderTitle title="Template Manager" />
            <HeaderButton
                headerRight={() => (
                    <ContextMenu
                        triggerIcon="setting"
                        placement="bottom"
                        buttons={[
                            {
                                label: 'Import Template',
                                icon: 'download',
                                onPress: async (close) => {
                                    close()
                                    const result = await pickJSONDocument()
                                    if (!result.success) {
                                        return
                                    }
                                    addTemplate(result.data)
                                },
                            },
                            {
                                label: 'Paste Template',
                                icon: 'file1',
                                onPress: (close) => {
                                    close()
                                    setShowPaste(true)
                                },
                            },
                            {
                                label: 'Get Templates',
                                icon: 'github',
                                onPress: (close) => {
                                    close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/126'
                                    )
                                },
                            },
                            {
                                label: 'Learn About Templates',
                                icon: 'info',
                                onPress: (close) => {
                                    close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/blob/dev/docs/CustomTemplates.md'
                                    )
                                },
                            },
                        ]}
                    />
                )}
            />
            <InputSheet
                visible={showPaste}
                setVisible={setShowPaste}
                onConfirm={(e) => {
                    try {
                        const data = JSON.parse(e)
                        addTemplate(data)
                    } catch (e) {
                        Logger.errorToast('Failed to import: ' + e)
                    }
                }}
                multiline
                title="Paste Template Here"
            />
            {templates.length > 0 && (
                <FlatList
                    contentContainerStyle={{ rowGap: 4 }}
                    data={templates}
                    keyExtractor={(item, index) => item.name}
                    renderItem={({ item, index }) => <TemplateItem item={item} index={index} />}
                />
            )}

            {templates.length === 0 && (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <MaterialCommunityIcons
                        name="file-question-outline"
                        size={64}
                        color={color.text._700}
                    />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        No Custom Templates Added
                    </Text>
                </View>
            )}
        </SafeAreaView>
    )
}

export default TemplateManager
