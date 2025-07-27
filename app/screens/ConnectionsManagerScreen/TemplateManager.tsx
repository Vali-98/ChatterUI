import ThemedButton from '@components/buttons/ThemedButton'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getDocumentAsync } from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system'
import { Stack } from 'expo-router'
import { FlatList, Linking, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import TemplateItem from './TemplateItem'
import { SafeAreaView } from 'react-native-safe-area-context'
import { pickJSONDocument } from '@lib/utils/File'
import HeaderTitle from '@components/views/HeaderTitle'
import HeaderButton from '@components/views/HeaderButton'
import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { useState } from 'react'

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
                    <PopupMenu
                        icon="setting"
                        placement="bottom"
                        options={[
                            {
                                label: 'Import Template',
                                icon: 'download',
                                onPress: async (m) => {
                                    m.current?.close()
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
                                onPress: (m) => {
                                    m.current?.close()
                                    setShowPaste(true)
                                },
                            },
                            {
                                label: 'Get Templates',
                                icon: 'github',
                                onPress: (m) => {
                                    m.current?.close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/126'
                                    )
                                },
                            },
                            {
                                label: 'Learn About Templates',
                                icon: 'info',
                                onPress: (m) => {
                                    m.current?.close()
                                    Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/blob/dev/docs/CustomTemplates.md'
                                    )
                                },
                            },
                        ]}
                    />
                )}
            />
            <TextBoxModal
                booleans={[showPaste, setShowPaste]}
                onConfirm={(e) => {
                    try {
                        const data = JSON.parse(e)
                        addTemplate(data)
                    } catch (e) {
                        Logger.errorToast('Failed to import: ' + e)
                    }
                }}
                multiline
                showPaste
                title="Paste Theme Here"
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
