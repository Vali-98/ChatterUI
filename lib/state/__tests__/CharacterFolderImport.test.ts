import { importCharacterFolderTree } from '../CharacterFolderImport'

describe('recursive character folder import', () => {
    const tree: Record<string, string[]> = {
        root: ['root/hero.PNG', 'root/readme.txt', 'root/nested', 'root/bad.json'],
        'root/nested': ['root/nested/villain.json', 'root/nested/deeper'],
        'root/nested/deeper': ['root/nested/deeper/sidekick.png', 'root/nested/deeper/notes.md'],
    }

    it('recurses through subdirectories and counts imported, skipped, and failed files', async () => {
        const imported: string[] = []
        const readDirectory = jest.fn(async (uri: string) => {
            const entries = tree[uri]
            if (!entries) throw new Error('Not a directory')
            return entries
        })

        const result = await importCharacterFolderTree('root', {
            readDirectory: readDirectory,
            importPNG: async (uri) => {
                imported.push(uri)
                return true
            },
            importJSON: async (uri) => {
                imported.push(uri)
                return !uri.endsWith('bad.json')
            },
        })

        expect(result).toEqual({ imported: 3, skipped: 2, failed: 1 })
        expect(imported).toEqual([
            'root/hero.PNG',
            'root/nested/villain.json',
            'root/nested/deeper/sidekick.png',
            'root/bad.json',
        ])
    })

    it('continues after a card importer throws', async () => {
        const result = await importCharacterFolderTree('root', {
            readDirectory: async (uri) => {
                if (uri === 'root') return ['root/broken.png', 'root/good.json']
                throw new Error('Not a directory')
            },
            importPNG: async () => {
                throw new Error('Bad PNG')
            },
            importJSON: async () => true,
        })

        expect(result).toEqual({ imported: 1, skipped: 0, failed: 1 })
    })
})
