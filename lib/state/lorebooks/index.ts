import { FileUtils } from '@lib/utils/File'

import { db as dbInternal } from './db'
import { lorebookImportSchema } from './schema'
import { Logger } from '../Logger'

export namespace Lorebooks {
    export const db = dbInternal

    export const importFromJSON = async () => {
        try {
            const file = await FileUtils.pickJSON()
            if (!file.success) return
            const lorebook = lorebookImportSchema.safeParse(file.data)
            if (lorebook.error) {
                Logger.error(lorebook.error.errors.map((item) => item.message).join('\n'))
                throw new Error('Incorrect Lorebook Schema')
            }
            await Lorebooks.db.mutate.importFromJSON(lorebook.data)
            Logger.info('Lorebook Imported')
        } catch (e) {
            Logger.errorToast('Failed to import Lorebook', e)
        }
    }
}
