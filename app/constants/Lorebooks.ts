import * as FS from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { Logger } from './Logger'

export namespace Lorebooks {
    type Entry = {
        keys: Array<string>
        content: string
        extensions: Record<string, any>
        enabled: boolean
        insertion_order: number // if two entries inserted, lower "insertion order" = inserted higher
        case_sensitive?: boolean

        // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
        name?: string // not used in prompt engineering
        priority?: number // if token budget reached, lower priority value = discarded first

        // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
        id?: number // not used in prompt engineering
        comment?: string // not used in prompt engineering
        selective?: boolean // if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry
        secondary_keys?: Array<string> // see field `selective`. ignored if selective == false
        constant?: boolean // if true, always inserted in the prompt (within budget limit)
        position?: 'before_char' | 'after_char' // whether the entry is placed before or after the character defs
    }

    type Lorebook = {
        name?: string
        description?: string
        scan_depth?: number // agnai: "Memory: Chat History Depth"
        token_budget?: number // agnai: "Memory: Context Limit"
        recursive_scanning?: boolean // no agnai equivalent. whether entry content can trigger other entries
        extensions: Record<string, any>
        entries: Array<Entry>
    }

    const lorebookdir = `${FS.documentDirectory}lorebooks/`

    const getLorebookDir = (name: string) => `${lorebookdir}${name}.json`

    export const loadFile = async (name: string) => {
        return FS.readAsStringAsync(getLorebookDir(name), {
            encoding: FS.EncodingType.UTF8,
        }).then((file) => {
            return JSON.parse(file)
        })
    }

    export const saveFile = async (name: string, lorebook: Object) => {
        return FS.writeAsStringAsync(getLorebookDir(name), JSON.stringify(lorebook), {
            encoding: FS.EncodingType.UTF8,
        })
    }

    export const deleteFile = async (name: string) => {
        return FS.deleteAsync(getLorebookDir(name))
    }

    export const getFileList = async () => {
        return await FS.readDirectoryAsync(lorebookdir)
    }

    export const uploadFile = async () => {
        return DocumentPicker.getDocumentAsync({ type: ['application/*'] }).then((result: any) => {
            if (result.canceled || !result.assets[0].name.endsWith('json')) {
                Logger.log(`Invalid File Type!`, true)
                return
            }
            let name = result.assets[0].name.replace(`.json`, '').replace('.settings', '')
            return FS.copyAsync({
                from: result.assets[0].uri,
                to: getLorebookDir(name),
            })
                .then(() => {
                    return FS.readAsStringAsync(getLorebookDir(name), {
                        encoding: FS.EncodingType.UTF8,
                    })
                })
                .then(async (file) => {
                    // fix here
                    await JSON.parse(file)
                    Logger.log('Lorebook Ddded!', true)
                    return name
                })
                .catch((error) => {
                    Logger.log(`Failed to Load: ${error.message}`, true)
                })
        })
    }

    export const getEntries = async (books: Array<string>) => {
        let entries = {}
        books.map(async (book: string) => {
            const bookfile: any = await loadFile(book)
            entries = { ...entries, ...bookfile.entries }
        })
        return entries
    }

    export const getLoreEntries = (prompt: string, entries: Array<Entry>) => {
        let lore = '' // append entries found  in prompt
        let entrynames: Array<string> = []

        entries.map((entry: Entry) => {
            if (!entry.keys.some((key: string) => prompt.includes(key))) return
            lore += entry.content + '\n'
            entrynames.push(entry?.name ?? ``)
        })

        return {
            entries: entries.filter((entry: Entry) => {
                return entry?.name && !entrynames.includes(entry.name)
            }),
            lore: lore,
        }
    }
}
