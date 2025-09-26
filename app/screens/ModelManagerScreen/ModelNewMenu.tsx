import ContextMenu from '@components/views/ContextMenu'
import { Model } from '@lib/engine/Local/Model'
import { View } from 'react-native'

type ModelNewMenuProps = {
    modelImporting: boolean
    setModelImporting: (b: boolean) => void
}

const ModelNewMenu: React.FC<ModelNewMenuProps> = ({ modelImporting, setModelImporting }) => {
    const handleSetExternal = async (close: () => void) => {
        close()
        if (modelImporting) return
        setModelImporting(true)
        await Model.linkModelExternal()
        setModelImporting(false)
    }

    const handleImportModel = async (close: () => void) => {
        close()
        if (modelImporting) return
        setModelImporting(true)
        await Model.importModel()
        setModelImporting(false)
    }

    return (
        <View>
            <ContextMenu
                placement="bottom"
                triggerIcon="addfile"
                disabled={modelImporting}
                buttons={[
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
