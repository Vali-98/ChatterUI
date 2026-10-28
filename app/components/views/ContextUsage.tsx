import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, View } from 'react-native'

import TText from '@components/text/TText'
import { useContextAllocation } from '@lib/hooks/ContextAllocation'
import { Theme } from '@lib/theme/ThemeManager'
import type { ContextAllocation } from '@lib/utils/contextAllocation'

import BottomSheet, { useBottomSheetRef } from './BottomSheet'

const ContextUsage = ({
    generatedLength,
    compact = false,
}: {
    generatedLength?: number
    compact?: boolean
}) => {
    const { t } = useTranslation()
    const ref = useBottomSheetRef()
    const { color, spacing } = Theme.useTheme()
    const allocation = useContextAllocation(generatedLength)
    const { values } = allocation
    const colors: Record<keyof ContextAllocation['values'], string> = {
        system: '#5b9bd5',
        history: color.primary._500,
        reserved: '#d4a34b',
        free: color.neutral._300,
    }
    const keys = Object.keys(values) as (keyof typeof values)[]
    const bar = () => (
        <View
            accessibilityRole="progressbar"
            accessibilityLabel={t('contextAllocation.title')}
            accessibilityValue={{
                min: 0,
                max: allocation.capacity,
                now: Math.min(allocation.capacity, allocation.used + allocation.reserved),
            }}
            style={{
                height: 12,
                borderRadius: 6,
                overflow: 'hidden',
                flexDirection: 'row',
                backgroundColor: color.neutral._300,
            }}>
            {keys.map(
                (key) =>
                    values[key] > 0 && (
                        <View
                            key={key}
                            style={{
                                width: `${(100 * values[key]) / allocation.denominator}%`,
                                backgroundColor: colors[key],
                                height: '100%',
                            }}
                        />
                    )
            )}
        </View>
    )
    const legend = () => (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {keys.map((key) => (
                <View
                    key={key}
                    style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}>
                    <View
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: colors[key],
                        }}
                    />
                    <TText color="400" size={12}>
                        {t(`contextAllocation.${key}`)}: {values[key]}
                    </TText>
                </View>
            ))}
        </View>
    )
    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('contextAllocation.title')}
                onPress={() => ref.current?.open()}>
                <View
                    style={{
                        paddingHorizontal: 8,
                        paddingVertical: compact ? 4 : 8,
                        rowGap: compact ? 4 : 8,
                    }}>
                    {!compact && (
                        <TText color="400" size={12}>
                            {t('contextAllocation.estimate')}
                        </TText>
                    )}
                    <TText size={compact ? 12 : 14} numberOfLines={compact ? 1 : undefined}>
                        {t('contextAllocation.usage', {
                            used: allocation.used,
                            capacity: allocation.capacity,
                        })}
                    </TText>
                    {bar()}
                    {!compact && legend()}
                    {allocation.overflow > 0 && (
                        <TText style={{ color: color.error._400 }} size={12}>
                            {t('contextAllocation.overflow', { count: allocation.overflow })}
                        </TText>
                    )}
                </View>
            </Pressable>
            <BottomSheet
                ref={ref}
                sheetStyle={{ maxHeight: '85%', paddingLeft: 0, paddingRight: 0 }}>
                <ScrollView contentContainerStyle={{ rowGap: 12, paddingHorizontal: spacing.xl2 }}>
                    <TText size={18}>{t('contextAllocation.title')}</TText>
                    <TText color="400">{t('contextAllocation.estimateDescription')}</TText>
                    {bar()}
                    {keys.map((key) => (
                        <View
                            key={key}
                            style={{
                                rowGap: 6,
                                borderTopWidth: 1,
                                borderTopColor: color.neutral._300,
                                paddingTop: 12,
                            }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <TText
                                    style={{
                                        color: key === 'free' ? color.text._400 : colors[key],
                                    }}>
                                    {t(`contextAllocation.${key}`)}
                                </TText>
                                <TText>{values[key]}</TText>
                            </View>
                            {key !== 'free' &&
                                allocation.items[key]
                                    .filter((item) => item.tokens > 0)
                                    .map((item) => (
                                        <View
                                            key={item.key}
                                            style={{
                                                paddingLeft: 12,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                            }}>
                                            <TText color="400">
                                                {t(`contextAllocation.details.${item.key}`)}
                                            </TText>
                                            <TText color="400">{item.tokens}</TText>
                                        </View>
                                    ))}
                        </View>
                    ))}
                    {allocation.summarySavings > 0 && (
                        <TText color="400">
                            {t('contextAllocation.summarySavings', {
                                count: allocation.summarySavings,
                            })}
                        </TText>
                    )}
                    {allocation.opportunistic.length > 0 && (
                        <>
                            <View
                                style={{
                                    borderTopWidth: 1,
                                    borderTopColor: color.neutral._300,
                                    marginBottom: 0,
                                }}
                            />
                            <TText>{t('contextAllocation.opportunistic')}</TText>
                            <TText color="400" size={12}>
                                {t('contextAllocation.opportunisticDescription')}
                            </TText>
                            {allocation.opportunistic.map((item, index) => (
                                <View
                                    key={`${item.key}-${index}`}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        columnGap: 12,
                                    }}>
                                    <TText color="400">
                                        {item.label ?? t(`contextAllocation.details.${item.key}`)}
                                    </TText>
                                    <TText color="400">
                                        {t('contextAllocation.upTo', { count: item.tokens })}
                                    </TText>
                                </View>
                            ))}
                        </>
                    )}
                </ScrollView>
            </BottomSheet>
        </>
    )
}
export default ContextUsage
