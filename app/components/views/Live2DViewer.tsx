/**
 * app/components/views/Live2DViewer.tsx
 *
 * Full-screen Live2D model viewer using react-native-webview.
 * Drop it as a background layer in the chat window.
 *
 * Usage:
 *   <Live2DViewer modelPath={charData.live2d_model_path} />
 *
 * Requirements:
 *   npm install react-native-webview
 *   npm install fflate            ← for ZIP/WKS import
 */

import React, { useCallback, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import WebView, { WebViewMessageEvent } from 'react-native-webview'
import { LIVE2D_VIEWER_HTML } from '@assets/live2d/viewerHtml'
import { Logger } from '@lib/state/Logger'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Live2DViewerProps {
    /** Absolute file:// path to the .model3.json */
    modelPath: string
    /** Optional callback when the model finishes loading */
    onLoaded?: (modelName: string) => void
    /** Optional callback on any render error */
    onError?: (message: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const Live2DViewer: React.FC<Live2DViewerProps> = ({ modelPath, onLoaded, onError }) => {
    const webviewRef = useRef<WebView>(null)

    /** Send a typed message to the WebView's JS context */
    const send = useCallback((payload: object) => {
        webviewRef.current?.injectJavaScript(
            `handleMessage(${JSON.stringify(JSON.stringify(payload))});true;`
        )
    }, [])

    /** Called once the HTML signals "ready" — trigger model load */
    const handleMessage = useCallback(
        (event: WebViewMessageEvent) => {
            try {
                const msg = JSON.parse(event.nativeEvent.data)
                switch (msg.type) {
                    case 'ready':
                        // WebView is initialised – load the model
                        send({ type: 'load', path: modelPath })
                        break
                    case 'loaded':
                        onLoaded?.(msg.model)
                        break
                    case 'error':
                        Logger.error('[Live2D] ' + msg.message)
                        onError?.(msg.message)
                        break
                }
            } catch (_) {}
        },
        [modelPath, onLoaded, onError, send]
    )

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <WebView
                ref={webviewRef}
                // Render inline HTML – no separate file needed
                source={{ html: LIVE2D_VIEWER_HTML }}
                style={styles.webview}
                // ── Android permissions ──────────────────────────────────
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                originWhitelist={['*']}
                // ── Behaviour ────────────────────────────────────────────
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                // ── Communication ────────────────────────────────────────
                onMessage={handleMessage}
                // Keep transparent background so the chat sits on top
                backgroundColor="transparent"
                // Disable cache so model changes reload properly
                cacheEnabled={false}
                // Avoid the safe-area insets handling on iOS
                contentInsetAdjustmentBehavior="never"
            />
        </View>
    )
}

export default Live2DViewer

const styles = StyleSheet.create({
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
})
