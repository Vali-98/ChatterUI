import { StyleSheet, View } from 'react-native'
type GridProps<T> = {
    items: T[]
    numColumns: number
    renderItem: (item: T, index: number) => React.ReactNode
    rowGap?: number
    columnGap?: number
}
const Grid = <T,>({ items, numColumns, renderItem, columnGap = 0, rowGap = 0 }: GridProps<T>) => {
    if (numColumns < 1) {
        return null
    }
    const rows: T[][] = []
    for (let i = 0; i < items.length; i += numColumns) {
        rows.push(items.slice(i, i + numColumns))
    }
    return (
        <View style={{ rowGap }}>
            {rows.map((row, rowIndex) => {
                const isReversed = rowIndex % 2 === 1
                const displayRow = isReversed ? [...row].reverse() : row
                return (
                    <View key={rowIndex} style={[styles.row, { columnGap }]}>
                        {displayRow.map((item, columnIndex) => {
                            const index = isReversed
                                ? rowIndex * numColumns + (row.length - 1 - columnIndex)
                                : rowIndex * numColumns + columnIndex
                            return (
                                <View key={index} style={styles.item}>
                                    {renderItem(item, index)}
                                </View>
                            )
                        })}
                        {/* Fill missing columns */}
                        {Array.from({ length: numColumns - row.length }, (_, index) => (
                            <View key={`empty-${index}`} style={styles.item} />
                        ))}
                    </View>
                )
            })}
        </View>
    )
}
const styles = StyleSheet.create({
    row: { flexDirection: 'row' },
    item: { flex: 1 },
})

export default Grid
