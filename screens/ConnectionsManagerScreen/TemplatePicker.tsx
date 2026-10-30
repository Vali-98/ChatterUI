import Octicons from '@react-native-vector-icons/octicons/static'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Pressable, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ListButton from '@components/buttons/ListButton'
import Aicons, { type AiconsGlyphName } from '@components/icons/Aicons'
import SelectionSheet, { type SelectionRow } from '@components/input/SelectionSheet'
import TText from '@components/text/TText'
import { type BottomSheetRef } from '@components/views/BottomSheet'
import { type APIConfiguration } from '@lib/engine/API/APIBuilder.types'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { Theme } from '@lib/theme/ThemeManager'

type TemplatePickerProps = { ref: BottomSheetRef; setPending: (connectionId: number) => void }
const TemplateItem = ({ item, selected, onPress, disabled }: SelectionRow<APIConfiguration>) => {
    const { color } = Theme.useTheme()
    const display = item.ui.display
    return (
        <ListButton
            active={selected}
            disabled={disabled}
            onPress={onPress}
            accessibilityState={{ selected }}
            style={{
                minHeight: 64,
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: 'center',
                columnGap: 12,
            }}>
            <Aicons
                name={(display?.icon ?? 'link') as AiconsGlyphName}
                size={24}
                color={color.text._400}
                style={{ minWidth: 32 }}
            />
            <View style={{ flex: 1, rowGap: 4 }}>
                <TText size={16}>{display?.name ?? item.name}</TText>
                {display?.description && <TText color="400">{display.description}</TText>}
            </View>
            {display?.link && (
                <Pressable
                    disabled={disabled}
                    onPress={(event) => {
                        event.stopPropagation()
                        void Linking.openURL(display.link!)
                    }}
                    style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
                    <Octicons name="globe" color={color.text._400} size={20} />
                </Pressable>
            )}
        </ListButton>
    )
}
const TemplatePicker = ({ ref, setPending }: TemplatePickerProps) => {
    const { t } = useTranslation()
    const pending = useRef<number | null>(null)
    const { addConnection, getTemplates, customTemplates } = useConnectionStore(
        useShallow((state) => ({
            addConnection: state.addConnection,
            getTemplates: state.getTemplates,
            customTemplates: state.customTemplates,
        }))
    )
    const templates = useMemo(
        () =>
            getTemplates().sort(
                (a, b) => (b.ui.display?.priority ?? 0) - (a.ui.display?.priority ?? 0)
            ),
        [getTemplates, customTemplates]
    )
    return (
        <SelectionSheet
            ref={ref}
            items={templates}
            keyExtractor={(item) => item.name}
            renderItem={(row) => <TemplateItem {...row} />}
            selectedKey={null}
            commitMode="confirm"
            title={t('connections.add.title')}
            confirmLabel={t('common.actions.create')}
            onSelect={(template) => {
                pending.current = addConnection({
                    ...template.defaultValues,
                    configName: template.name,
                    friendlyName: t('connections.add.defaultFriendlyName'),
                })
            }}
            onClose={() => {
                if (pending.current !== null) {
                    const connectionId = pending.current
                    pending.current = null
                    setPending(connectionId)
                }
            }}
            buttonVariant="primary"
            buttonLevel="primary"
        />
    )
}
export default TemplatePicker
