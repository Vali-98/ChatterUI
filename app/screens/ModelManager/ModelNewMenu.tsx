import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useState } from 'react'
import { View } from 'react-native'

type ModelNewMenuProps = {
    modelImporting: boolean
    setModelImporting: (b: boolean) => void
}

const ModelNewMenu: React.FC<ModelNewMenuProps> = ({ modelImporting, setModelImporting }) => {
    const [showDownload, setShowDownload] = useState(false)

    const handleDownloadModel = (text: string) => {}

    const handleSetExternal = async (menuRef: MenuRef) => {
        menuRef.current?.close()
        if (modelImporting) return
        setModelImporting(true)
        await Llama.linkModelExternal()
        setModelImporting(false)
    }

    const handleImportModel = async (menuRef: MenuRef) => {
        menuRef.current?.close()
        if (modelImporting) return
        setModelImporting(true)
        await Llama.importModel()
        setModelImporting(false)
    }

    return (
        <View>
            <TextBoxModal
                title="Enter Model Download Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) => handleDownloadModel(text)}
                showPaste
            />
            <PopupMenu
                placement="bottom"
                icon="addfile"
                disabled={modelImporting}
                options={[
                    {
                        label: 'Copy Model Into ChatterUI',
                        icon: 'download',
                        onPress: handleImportModel,
                    },
                    {
                        label: 'Use External Model',
                        icon: 'link',
                        onPress: handleSetExternal,
                    },
                ]}
            />
        </View>
    )
}

export default ModelNewMenu
