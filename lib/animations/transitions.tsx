import { LayoutAnimationsValues, withTiming } from 'react-native-reanimated'

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
