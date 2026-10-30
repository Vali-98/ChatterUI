import { View } from 'react-native'
import { useDownloadStore } from '@lib/downloads/store'
import DownloadItem from './DownloadItem'

const DownloadList = ({ downloadIds }: { downloadIds?: string[] }) => {
    const allDownloads = useDownloadStore((state) => state.downloads)
    const downloads = downloadIds
        ? allDownloads.filter((item) => downloadIds.includes(item.id))
        : allDownloads.filter((item) => item.status !== 'completed')
    return (
        <View style={{ gap: 12 }}>
            {downloads.map((item) => (
                <DownloadItem key={item.id} item={item} />
            ))}
        </View>
    )
}
export default DownloadList
