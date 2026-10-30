import type { ReactNode } from 'react'
import { View } from 'react-native'

import { NoticeStack } from './Notice'
import OperationNotices from './OperationNotices'

// Chat/home supply their own placement alongside their screen-specific notices.
// Other screens place operation notices in their content area, below the native header.
const ScreenNoticeLayout = ({
    children,
    routeName,
}: {
    children: ReactNode
    routeName: string
}) => (
    <View style={{ flex: 1 }}>
        {children}
        {routeName !== 'chat' && routeName !== 'index' && (
            <NoticeStack>
                <OperationNotices />
            </NoticeStack>
        )}
    </View>
)

export default ScreenNoticeLayout
