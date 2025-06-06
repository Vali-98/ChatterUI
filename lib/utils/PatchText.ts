import { Logger } from '@lib/state/Logger'
import React from 'react'
import { createTransformProps } from 'react-fast-hoc'
import { Platform, Text, StyleSheet } from 'react-native'

const patchText = () => {
    if (Platform.OS !== 'android') {
        return
    }

    const styles = StyleSheet.create({
        font: { fontFamily: 'Roboto' },
    })

    const transform = createTransformProps(
        (props) => ({
            textBreakStrategy: 'simple',
            numberOfLines: 0,
            ...props,
            style: [styles.font, props.style],
        }),
        {
            namePrefix: 'Reset.',
            mimicToNewComponent: false,
        }
    )

    Object.assign(Text, transform(Text))
}

const patchRender = () => {
    if (Platform.OS !== 'android') {
        return
    }

    // @ts-expect-error
    const oldRender = Text.render ?? Text.prototype?.render
    const style = StyleSheet.create({ font: { fontFamily: 'Roboto' } })
    if (!oldRender) {
        console.error('Text.render or Text.prototype.render is not defined, cannot patch font.')
        return
    }

    if (Text.prototype?.render) {
        Text.prototype.render = function (...args: any[]) {
            const origin = oldRender.call(this, ...args)
            return React.cloneElement(origin, {
                style: [style.font, origin.props.style],
            })
        }
        // @ts-expect-error
    } else if (Text.render) {
        // @ts-expect-error
        Text.render = function (...args: any[]) {
            const origin = oldRender.call(this, ...args)
            return React.cloneElement(origin, {
                style: [style.font, origin.props.style],
            })
        }
    } else {
        console.error('Text.render or Text.prototype.render is not defined, cannot patch font.')
    }
}

export const patchAndroidText = () => {
    if (Platform.OS !== 'android') return
    try {
        patchText()
        patchRender()
    } catch (e) {
        Logger.error('Failed to patch text: ' + JSON.stringify(e))
    }
}
