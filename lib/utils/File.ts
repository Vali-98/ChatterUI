import { DownloadDirectoryPath, writeFile } from 'cui-fs'

/**
 *
 * @param data string data of file
 * @param filename filename to be written, include extension
 * @param encoding encoding of file
 */
export const saveStringToDownload = async (
    data: string,
    filename: string,
    encoding: 'ascii' | 'base64' | `utf8`
) => {
    if (encoding === 'utf8') data = btoa(data)
    await writeFile(`${DownloadDirectoryPath}/${filename}`, data, { encoding: encoding })
}

const gb = 1000 ** 3
const mb = 1000 ** 2

/**
 * Gets a human friendly version of file size
 * @param size size in bytes
 * @returns string containing readable file size
 */
export const readableFileSize = (size: number) => {
    if (size < gb) {
        const sizeInMB = size / mb
        return `${sizeInMB.toFixed(2)} MB`
    } else {
        const sizeInGB = size / gb
        return `${sizeInGB.toFixed(2)} GB`
    }
}
