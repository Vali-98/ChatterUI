import AntDesign from '@react-native-vector-icons/ant-design/static'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { View, Text, StyleSheet } from 'react-native'
import * as Progress from 'react-native-progress'

import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Theme } from '@lib/theme/ThemeManager'

type ModelInfoHeaderProps = {
    modelImporting: boolean
    modelListLength: number
    modelUpdatedAt: Date | undefined
}

const ModelInfoHeader: React.FC<ModelInfoHeaderProps> = ({
    modelImporting,
    modelListLength,
    modelUpdatedAt,
}) => {
    const { t } = useTranslation()
    const styles = useStyles()
    const { color } = Theme.useTheme()

    const modelName = Llama.useLlamaModelStore((state) => state.model?.name)

    return (
        <View style={styles.modelContainer}>
            {!modelImporting && modelListLength !== 0 && (
                <Text style={styles.subtitle}>
                    {t('model.info.loaded')}:{' '}
                    <Text style={styles.modelTitle} ellipsizeMode="tail" numberOfLines={1}>
                        {modelName ?? t('common.labels.none')}
                    </Text>
                </Text>
            )}
            {!modelImporting && modelListLength === 0 && modelUpdatedAt && (
                <View>
                    <Text style={styles.hint}>
                        <Trans
                            i18nKey="model.info.hint"
                            components={{
                                icon: (
                                    <AntDesign name="file-add" size={16} color={color.text._400} />
                                ),
                            }}
                        />
                    </Text>
                </View>
            )}

            {modelImporting && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Progress.Bar
                        style={{ flex: 5 }}
                        indeterminate
                        indeterminateAnimationDuration={2000}
                        color={color.primary._500}
                        borderColor={color.neutral._300}
                        height={12}
                        borderRadius={12}
                        width={null}
                    />

                    <Text
                        style={{
                            flex: 2,
                            color: color.text._100,
                            textAlign: 'center',
                        }}>
                        {t('common.messages.importingFile')}
                    </Text>
                </View>
            )}
        </View>
    )
}

export default ModelInfoHeader

export const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        mainContainer: {
            paddingTop: spacing.xl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl2,
            flex: 1,
        },

        list: {
            marginTop: 16,
            flex: 1,
        },

        modelContainer: {
            borderRadius: borderRadius.l,
            paddingVertical: spacing.l,
            paddingHorizontal: spacing.xl2,
            backgroundColor: color.neutral._200,
            marginBottom: spacing.l,
        },

        title: {
            fontSize: fontSize.l,
            color: color.text._100,
        },

        modelTitle: {
            color: color.primary._700,
            flex: 1,
        },

        subtitle: {
            color: color.text._300,
        },

        hint: {
            color: color.text._400,
        },
    })
}
