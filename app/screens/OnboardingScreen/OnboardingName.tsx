import { useState } from 'react'
import { FadeIn } from 'react-native-reanimated'

import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import Avatar from '@components/views/Avatar'
import SequenceAnimationView from '@components/views/SequenceAnimationView'
import { Characters } from '@lib/state/characters'
import { Theme } from '@lib/theme/ThemeManager'

import OnboardingView from './OnboardNavigation'

const OnboardingName = () => {
    const getImage = Characters.useUserStore((state) => state.getImage)
    const { color } = Theme.useTheme()
    const [canContinue, setCanContinue] = useState(false)

    return (
        <OnboardingView canGoBack canContinue={canContinue}>
            <SequenceAnimationView
                style={{ alignItems: 'center' }}
                animation={(index) => {
                    const animation = FadeIn.delay(500 + index * 500).duration(400)
                    return animation
                }}
                onComplete={() => setCanContinue(true)}>
                <Avatar
                    targetImage={getImage()}
                    style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        marginBottom: 32,
                        borderWidth: 1,
                        borderColor: color.primary._500,
                    }}
                />

                <ThemedTextInput
                    value=""
                    containerStyle={{ flex: 0, minWidth: 200, marginBottom: 24 }}
                />
                <TText>{}</TText>
                <TText color="700">{}</TText>
            </SequenceAnimationView>
        </OnboardingView>
    )
}

export default OnboardingName
