import { useIsFocused } from 'expo-router'

import CharacterImportNotice from './CharacterImportNotice'
import ModelOperationNotice from './ModelOperationNotice'

const OperationNotices = () => {
    const focused = useIsFocused()
    if (!focused) return null
    return (
        <>
            <CharacterImportNotice />
            <ModelOperationNotice />
        </>
    )
}

export default OperationNotices
