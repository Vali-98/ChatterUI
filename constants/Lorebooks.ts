
import * as FS from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { ToastAndroid } from 'react-native'

export namespace Lorebooks {

    const lorebookdir = `${FS.documentDirectory}lorebooks/`
    
    const getLorebookDir = (name :string) => `${lorebookdir}${name}.json`

    export const loadFile = async (name : string) => {    
        return FS.readAsStringAsync(getLorebookDir(name), {encoding: FS.EncodingType.UTF8}).then((file) => {
            return file
        })
    }

    export const saveFile = async (name : string, lorebook : Object) => {
        return FS.writeAsStringAsync(getLorebookDir(name), JSON.stringify(lorebook), {encoding:FS.EncodingType.UTF8})
    }

    export const deleteFile = async (name : string) => {
        return FS.deleteAsync(getLorebookDir(name))
    }

    export const getFileList = async () => {
        return FS.readDirectoryAsync(lorebookdir)
    }

    export const uploadFile= async () => {
        return DocumentPicker.getDocumentAsync({type:['application/*']}).then((result : any) => {
            if(result.canceled || !result.assets[0].name.endsWith('json')) {
                ToastAndroid.show(`Invalid File Type!`, 3000)    
                return
            }
            let name = result.assets[0].name.replace(`.json`, '').replace('.settings', '')
            return FS.copyAsync({
                from: result.assets[0].uri, 
                to: getLorebookDir(name)
            }).then(() => {
                return FS.readAsStringAsync(getLorebookDir(name), {encoding: FS.EncodingType.UTF8})
            }).then(async (file) => {
                await JSON.parse(file)
                return name
            }).catch(error => {
                console.log(error)
                ToastAndroid.show(error.message, 2000)
            })
        })
    }
}