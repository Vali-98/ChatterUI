import * as FS from 'expo-file-system'
import { Logger } from './Logger'

export type UserCard = {
    description: string
}

export namespace Users {
    export const defaultUserName = 'User'

    export const defaultUserCard = {
        description: '',
    }

    export const createUser = async (name: string) => {
        return FS.makeDirectoryAsync(`${FS.documentDirectory}persona/${name}`)
            .then(() => {
                return FS.writeAsStringAsync(
                    `${FS.documentDirectory}persona/${name}/${name}.json`,
                    JSON.stringify(defaultUserCard),
                    { encoding: FS.EncodingType.UTF8 }
                )
            })
            .catch(() => {
                Logger.log(`Could not create user.`)
            })
    }

    export const deleteFile = async (name: string) => {
        return FS.deleteAsync(`${FS.documentDirectory}persona/${name}`)
    }

    export const loadFile = async (name: string) => {
        return FS.readAsStringAsync(`${FS.documentDirectory}persona/${name}/${name}.json`, {
            encoding: FS.EncodingType.UTF8,
        })
    }

    export const saveFile = async (name: string, card: object) => {
        return FS.writeAsStringAsync(
            `${FS.documentDirectory}persona/${name}/${name}.json`,
            JSON.stringify(card),
            { encoding: FS.EncodingType.UTF8 }
        )
    }

    export const copyImage = async (uri: string, name: string) => {
        return FS.copyAsync({
            from: uri,
            to: getImageDir(name),
        })
    }

    export const getFileList = () => {
        return FS.readDirectoryAsync(`${FS.documentDirectory}persona`)
    }

    export const getImageDir = (name: string) => {
        return `${FS.documentDirectory}persona/${name}/${name}.png`
    }
}
