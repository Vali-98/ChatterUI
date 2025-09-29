import { LayoutRectangle } from 'react-native'
import { ExitAnimationsValues, LayoutAnimationsValues, withTiming } from 'react-native-reanimated'

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
