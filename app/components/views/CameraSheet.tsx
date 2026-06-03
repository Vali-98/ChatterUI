import { CameraCapturedPicture, CameraView } from 'expo-camera'
import { useRef } from 'react'

import ThemedButton from '@components/buttons/ThemedButton'

import BottomSheet, { BottomSheetRef } from './BottomSheet'

interface CameraSheetProps {
    ref: BottomSheetRef
    onTakePicture: (picture: CameraCapturedPicture) => void
}

const CameraSheet: React.FC<CameraSheetProps> = ({ ref, onTakePicture }) => {
    const cameraRef = useRef<CameraView>(null)

    const handleTakePicture = async () => {
        const camera = cameraRef.current
        if (!camera) return
        const picture = await camera.takePictureAsync()
        if (!picture) return
        onTakePicture(picture)
        ref.current?.close()
    }

    return (
        <BottomSheet
            ref={ref}
            sheetStyle={{ flex: 1, maxHeight: '70%', justifyContent: 'space-between' }}>
            <CameraView
                ref={cameraRef}
                autofocus="on"
                mode="picture"
                style={{ flex: 1, borderRadius: 8, marginBottom: 24 }}
            />
            <ThemedButton iconName="camera" onPress={handleTakePicture} />
        </BottomSheet>
    )
}

export default CameraSheet
