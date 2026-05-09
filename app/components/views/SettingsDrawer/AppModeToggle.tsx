import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import HorizontalSelector from '@components/input/HorizontalSelector';
import { useAppMode } from '@lib/state/AppMode';

const AppModeToggle = () => {
    const { t } = useTranslation();
    const { appMode, setAppMode } = useAppMode();

    return (
        <HorizontalSelector
            style={{ flex: 0, paddingBottom: 4, paddingHorizontal: 8 }}
            label={t('common.settings')}
            values={[
                {
                    value: 'local',
                    label: t('common.settings'), // Assuming 'Local' maps to 'Settings' for now, adjust if needed
                    icon: Platform.OS === 'android' ? 'phone-android' : 'phone-iphone',
                },
                { value: 'remote', label: t('common.settings') }, // Assuming 'Remote' also maps to 'Settings', adjust if needed
            ]}
            selected={appMode}
            onPress={setAppMode}
        />
    );
};

export default AppModeToggle;
