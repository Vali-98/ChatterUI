import { LayoutRectangle } from 'react-native'
import {
    EntryAnimationsValues,
    ExitAnimationsValues,
    LayoutAnimation,
    LayoutAnimationsValues,
    withTiming,
} from 'react-native-reanimated'

export const XAxisOnlyTransition = (values: LayoutAnimationsValues) => {
    'worklet'
    return {
        animations: {
            originX: withTiming(values.targetOriginX),
            width: withTiming(values.targetWidth),
        },

        initialValues: {
            originX: values.currentOriginX,
            width: values.currentWidth,
        },
    }
}

export const YAxisOnlyTransition = (values: LayoutAnimationsValues) => {
    'worklet'
    return {
        animations: {
            originY: withTiming(values.targetOriginY),
            height: withTiming(values.targetHeight),
        },

        initialValues: {
            originY: values.currentOriginY,
            height: values.currentHeight,
        },
    }
}

export const ZoomOutToAnchor = (values: ExitAnimationsValues, anchor: LayoutRectangle) => {
    'worklet'
    const originX = anchor.x + anchor.width / 2
    const originY = anchor.y + anchor.height / 2
    const duration = 200
    const animations = {
        originX: withTiming(originX, { duration }),
        originY: withTiming(originY, { duration }),
        height: withTiming(0, { duration }),
        width: withTiming(0, { duration }),
        opacity: withTiming(0, { duration: duration - 50 }),
    }
    const initialValues = {
        originX: values.currentOriginX,
        originY: values.currentOriginY,
        height: values.currentHeight,
        width: values.currentWidth,
        opacity: 1,
    }

    return { initialValues, animations }
}

const DEFAULT_ENTERING_SPEED = 150
const DEFAULT_EXITING_SPEED = 150

export function ExpandHeightIn(values: EntryAnimationsValues): LayoutAnimation {
    'worklet'

    return {
        initialValues: {
            height: 0,
            opacity: 0,
        },

        animations: {
            height: withTiming(values.targetHeight, { duration: DEFAULT_ENTERING_SPEED }),
            opacity: withTiming(1, { duration: DEFAULT_ENTERING_SPEED }),
        },
    }
}

export function ExpandHeightUpIn(values: EntryAnimationsValues): LayoutAnimation {
    'worklet'

    return {
        initialValues: {
            height: 0,
            originY: values.targetOriginY + values.targetHeight,
            opacity: 0,
        },

        animations: {
            originY: withTiming(values.targetOriginY, { duration: DEFAULT_ENTERING_SPEED }),
            opacity: withTiming(1, { duration: DEFAULT_ENTERING_SPEED }),
            height: withTiming(values.targetHeight, { duration: DEFAULT_ENTERING_SPEED }),
        },
    }
}

export function ShrinkHeightOut(values: ExitAnimationsValues): LayoutAnimation {
    'worklet'

    return {
        initialValues: {
            height: values.currentHeight,
            opacity: 1,
        },

        animations: {
            height: withTiming(0, { duration: DEFAULT_EXITING_SPEED }),
            opacity: withTiming(0.3, { duration: DEFAULT_EXITING_SPEED }),
        },
    }
}

export function ShrinkHeightUpOut(values: ExitAnimationsValues): LayoutAnimation {
    'worklet'

    return {
        initialValues: {
            height: values.currentHeight,
            originY: values.currentOriginY,
            opacity: 1,
        },

        animations: {
            originY: withTiming(values.currentGlobalOriginY + values.currentHeight, {
                duration: DEFAULT_EXITING_SPEED,
            }),
            height: withTiming(0, { duration: DEFAULT_EXITING_SPEED }),
            opacity: withTiming(0.3, { duration: DEFAULT_EXITING_SPEED }),
        },
    }
}
