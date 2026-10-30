import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ChatAppearancePreview from '@components/settings/ChatAppearancePreview'
import ThemePalettePicker from '@components/settings/ThemePalettePicker'
import TText from '@components/text/TText'
import { DefaultColorSchemes, type ThemeColor } from '@lib/theme/ThemeColor'
import { Theme, ThemePreview } from '@lib/theme/ThemeManager'

const AppearanceSetup = ({
    selected,
    onSelect,
}: {
    selected: ThemeColor
    onSelect: (theme: ThemeColor) => void
}) => {
    const { t } = useTranslation()
    const customColors = Theme.useColorState((state) => state.customColors)
    return (
        <View style={{ gap: 24 }}>
            <ThemePreview color={selected}>
                <ChatAppearancePreview />
            </ThemePreview>
            <ThemePalettePicker
                themes={[...DefaultColorSchemes.schemes, ...customColors]}
                edgeLength={14}
                selected={selected}
                onSelect={onSelect}
            />
            <TText color="400">{t('onboarding.appearanceLater')}</TText>
        </View>
    )
}
export default AppearanceSetup
