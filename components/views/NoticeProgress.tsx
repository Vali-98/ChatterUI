import ThemedIcon, { type IconName } from '@components/icons/ThemedIcon'
import { Theme } from '@lib/theme/ThemeManager'

import { getFloatingPanelColor } from './FloatingPanel'
import Notice, { type NoticeProps } from './Notice'
import ProgressBar from './ProgressBar'
import ThemedSpinner from './ThemedSpinner'

export type NoticeProgressProps = Omit<NoticeProps, 'leading' | 'children'> & {
    /** Percentage from 0 to 100. Omit for indeterminate work. */
    progress?: number
    isRunning?: boolean
    iconName?: IconName
    showPercentage?: boolean
}

const NoticeProgress = ({
    label,
    progress,
    isRunning = true,
    iconName,
    showPercentage = true,
    variant = 'neutral',
    style,
    ...props
}: NoticeProgressProps) => {
    const { color } = Theme.useTheme()
    const progressColor = getFloatingPanelColor(color, variant)
    const percentage = progress === undefined ? undefined : Math.max(0, Math.min(100, progress))
    const leading =
        percentage === undefined && isRunning ? (
            <ThemedSpinner color={color.primary._400} />
        ) : iconName ? (
            <ThemedIcon iconName={iconName} size={16} color={color.text._400} />
        ) : undefined
    return (
        <Notice
            {...props}
            style={[percentage !== undefined && { paddingBottom: 8 }, style]}
            variant={variant}
            leading={leading}
            label={
                showPercentage && percentage !== undefined
                    ? `${label} · ${Math.floor(percentage)}%`
                    : label
            }>
            {percentage !== undefined && (
                <ProgressBar progress={percentage} color={progressColor} />
            )}
        </Notice>
    )
}

export default NoticeProgress
