import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

const AuthorNoteEmpty = () => {
    const { t } = useTranslation()
    const { color, fontSize } = Theme.useTheme()
    return (
        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
            <Text style={{ color: color.text._700, fontSize: fontSize.l, fontStyle: 'italic' }}>
                {t('authorNotes.empty')}
            </Text>
        </View>
    )
}

export default AuthorNoteEmpty
