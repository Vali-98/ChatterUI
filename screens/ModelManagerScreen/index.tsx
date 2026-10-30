import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionList } from 'react-native'
import Animated, { Easing, SlideInLeft, SlideOutLeft } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import DownloadList from '@components/downloads/DownloadList'
import HorizontalSelector from '@components/input/HorizontalSelector'
import SectionTitle from '@components/text/SectionTitle'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { useLocalModelResourceState } from '@lib/engine/generation/localResource'
import { Model } from '@lib/engine/Local/Model'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Theme } from '@lib/theme/ThemeManager'

import ModelEmpty from './ModelEmpty'
import ModelInfoHeader from './ModelInfoHeader'
import ModelItem from './ModelItem'
import ModelNewMenu from './ModelNewMenu'
import ModelSettings from './ModelSettings'

const ModelManagerScreen = () => {
    const { t } = useTranslation()
    const { spacing } = Theme.useTheme()

    const { data: modelList, updatedAt: modelUpdatedAt } = useLiveQueryAsync(
        Model.getModelListQuery(),
        { key: ['model-list'], watch: [{ table: 'model_data' }, { table: 'model_mmproj_links' }] }
    )
    const { data: mmprojList } = useLiveQueryAsync(Model.getMMPROJListQuery(), {
        key: ['mmproj-list'],
        watch: [{ table: 'model_data' }, { table: 'model_mmproj_links' }],
    })

    const [showSettings, setShowSettings] = useState(false)
    const modelLoading = useLocalModelResourceState((state) => state.operations > 0)
    const [modelImporting, setModelImporting] = useState(false)

    const data = [
        {
            title: t('model.title'),
            data: modelList ?? [],
        },
        {
            title: t('model.mtmd'),
            data: mmprojList ?? [],
        },
    ]

    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                paddingTop: spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <HeaderTitle title={showSettings ? t('model.settings.title') : t('model.title')} />
            <HeaderButton
                headerRight={() =>
                    !showSettings && (
                        <ModelNewMenu
                            modelImporting={modelImporting}
                            setModelImporting={setModelImporting}
                        />
                    )
                }
            />

            {!showSettings && (
                <Animated.View
                    style={{ flex: 1 }}
                    entering={SlideInLeft.easing(Easing.inOut(Easing.cubic))}
                    exiting={SlideOutLeft.easing(Easing.inOut(Easing.cubic))}>
                    <ModelInfoHeader
                        modelImporting={modelImporting}
                        modelListLength={modelList.length}
                        modelUpdatedAt={modelUpdatedAt}
                    />

                    <SectionList
                        style={{ flex: 1 }}
                        sections={data}
                        renderItem={({ item, index }) => (
                            <ModelItem
                                item={item}
                                mmprojList={mmprojList}
                                modelLoading={modelLoading}
                                modelImporting={modelImporting}
                            />
                        )}
                        renderSectionHeader={({ section: { title, data } }) => {
                            if (mmprojList.length > 0)
                                return (
                                    <SectionTitle
                                        visible={data.length > 0}
                                        style={{ marginVertical: 16 }}>
                                        {title}
                                    </SectionTitle>
                                )
                            return <></>
                        }}
                        keyExtractor={(item) => item.id.toString()}
                        removeClippedSubviews={false}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={<DownloadList />}
                        ListEmptyComponent={() => <ModelEmpty />}
                    />
                </Animated.View>
            )}

            {showSettings && (
                <ModelSettings
                    modelImporting={modelImporting}
                    modelLoading={modelLoading}
                    exit={() => setShowSettings(false)}
                />
            )}
            <HorizontalSelector
                values={[
                    { label: t('model.title'), value: false },
                    { label: t('common.navigation.settings'), value: true },
                ]}
                selected={showSettings}
                onPress={setShowSettings}
            />
        </SafeAreaView>
    )
}

export default ModelManagerScreen
