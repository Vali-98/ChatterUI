export type CharacterFolderImportCounts = {
    imported: number
    skipped: number
    failed: number
}

type CharacterFolderImportDependencies = {
    readDirectory: (uri: string) => Promise<string[]>
    importPNG: (uri: string) => Promise<boolean>
    importJSON: (uri: string) => Promise<boolean>
    onError?: (uri: string, error: unknown) => void
}

const supportedExtension = (uri: string): 'png' | 'json' | undefined => {
    let decodedURI = uri
    try {
        decodedURI = decodeURIComponent(uri)
    } catch {
        // A malformed escape should not prevent the rest of the folder from importing.
    }

    const filename = decodedURI.split(/[\\/]/).pop()?.split(/[?#]/, 1)[0]
    const extension = filename?.split('.').pop()?.toLocaleLowerCase()
    return extension === 'png' || extension === 'json' ? extension : undefined
}

export const importCharacterFolderTree = async (
    rootURI: string,
    dependencies: CharacterFolderImportDependencies
): Promise<CharacterFolderImportCounts> => {
    const counts: CharacterFolderImportCounts = { imported: 0, skipped: 0, failed: 0 }
    const visitedDirectories = new Set<string>()

    const visitEntries = async (entries: string[]) => {
        for (const uri of entries) {
            try {
                const children = await dependencies.readDirectory(uri)
                await visitDirectory(uri, children)
                continue
            } catch {
                // SAF reports files by rejecting directory enumeration. Classify the entry below.
            }

            const extension = supportedExtension(uri)
            if (!extension) {
                counts.skipped += 1
                continue
            }

            try {
                const imported =
                    extension === 'png'
                        ? await dependencies.importPNG(uri)
                        : await dependencies.importJSON(uri)
                if (imported) counts.imported += 1
                else counts.failed += 1
            } catch (error) {
                counts.failed += 1
                dependencies.onError?.(uri, error)
            }
        }
    }

    const visitDirectory = async (uri: string, knownEntries?: string[]) => {
        if (visitedDirectories.has(uri)) return
        visitedDirectories.add(uri)

        try {
            await visitEntries(knownEntries ?? (await dependencies.readDirectory(uri)))
        } catch (error) {
            counts.failed += 1
            dependencies.onError?.(uri, error)
        }
    }

    await visitDirectory(rootURI)
    return counts
}
