import { Text, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Lorebooks } from '@constants/Lorebooks'

const LorebookEntryInfo = () => {
	const { bookName } = useLocalSearchParams()
	const [book, setBook] = useState(undefined)

	useEffect(() => {
		loadBook()
	}, [])

	const loadBook = async () => {
		setBook(await Lorebooks.loadFile(bookName))
	}

	return (
		<ScrollView>
			<Stack.Screen options={{title: bookName , animation: 'fade'}} />
			
			{book != undefined && Object.keys(book.entries).map((key, index) => 
				<Text key={index}>{book.entries[key].content}</Text>
			)}
			
		</ScrollView>
	)
}

export default LorebookEntryInfo