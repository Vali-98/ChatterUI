import { Image } from 'react-native'

import TText from '@components/text/TText'

import OnboardingView from './OnboardNavigation'

const OnboardingScreen = () => {
    return (
        <OnboardingView next="/screens/OnboardingScreen/OnboardingName" canGoBack={false}>
            <Image
                source={require('../../../assets/images/icon.png')}
                style={{
                    width: 120,
                    height: 120,
                    backgroundColor: 'black',
                    borderRadius: 60,
                    marginBottom: 64,
                }}
            />
            <TText size={20}></TText>
        </OnboardingView>
    )
}

export default OnboardingScreen
