import ThemedButton from '@components/buttons/ThemedButton'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Model } from '@lib/engine/Local/Model'
import { Theme } from '@lib/theme/ThemeManager'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { SectionList } from 'react-native'
import Animated, { Easing, SlideInLeft, SlideOutLeft } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import SectionTitle from '@components/text/SectionTitle'
import { SafeAreaView } from 'react-native-safe-area-context'
import ModelEmpty from './ModelEmpty'
import ModelInfoHeader from './ModelInfoHeader'
import ModelItem from './ModelItem'
import ModelNewMenu from './ModelNewMenu'
import ModelSettings from './ModelSettings'

const ModelManagerScreen = () => {
    const { spacing } = Theme.useTheme()

    const { data: mmprojLinks } = useLiveQuery(Model.getMMPROJLinks())

    const { data: modelList, updatedAt: modelUpdatedAt } = useLiveQuery(
        Model.getModelListQuery2(),
        [mmprojLinks]
    )
    const { data: mmprojList, updatedAt: mmprojUpdated } = useLiveQuery(Model.getMMPROJListQuery())

    const [showSettings, setShowSettings] = useState(false)
    const [modelLoading, setModelLoading] = useState(false)
    const [modelImporting, setModelImporting] = useState(false)

    const { setloadProgress } = Llama.useLlamaModelStore(
        useShallow((state) => ({
            setloadProgress: state.setLoadProgress,
        }))
    )

    const data = [
        {
            title: 'Models',
            data: modelList,
        },
        {
            title: 'Multimodal Adapters',
            data: mmprojList,
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
            <HeaderTitle title={showSettings ? 'Model Settings' : 'Models'} />
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
                        modelLoading={modelLoading}
                        modelListLength={modelList.length}
                        modelUpdatedAt={modelUpdatedAt}
                    />

                    <SectionList
                        style={{
                            marginTop: 16,
                            flex: 1,
                        }}
                        sections={data}
                        renderItem={({ item, index }) => (
                            <ModelItem
                                item={item}
                                mmprojList={mmprojList}
                                modelLoading={modelLoading}
                                setModelLoading={(b: boolean) => {
                                    if (b) setloadProgress(0)
                                    setModelLoading(b)
                                }}
                                modelImporting={modelImporting}
                            />
                        )}
                        renderSectionHeader={({ section: { title, data } }) => {
                            if (mmprojList.length > 0)
                                return (
                                    <SectionTitle
                                        visible={data.length > 0}
                                        style={{ marginBottom: 16 }}>
                                        {title}
                                    </SectionTitle>
                                )
                            return <></>
                        }}
                        keyExtractor={(item) => item.id.toString()}
                        removeClippedSubviews={false}
                        showsVerticalScrollIndicator={false}
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
            <ThemedButton
                label={showSettings ? 'Back To Models' : 'Show Settings'}
                onPress={() => setShowSettings(!showSettings)}
            />
        </SafeAreaView>
    )
}

export default ModelManagerScreen
