import {
    ScrollView, StyleSheet, KeyboardAvoidingView 
} from 'react-native'
import { useEffect, useRef } from 'react'
import {ChatItem} from './ChatItem'
import { Global } from '../../../constants/global'
import { useMMKVBoolean, useMMKVListener } from 'react-native-mmkv'
 
const ChatWindow = ({messages}) => {

    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    // this solution will have to change once editing is enabled as updating the content will scroll
    const scrollViewRef = useRef(null); 
    useMMKVListener((key) => {
        if(key === Global.CurrentCharacter || key === Global.CurrentChat)
        scrollViewRef.current?.scrollToEnd()
    })
    useEffect(() => {
        if (!nowGenerating) scrollViewRef.current?.scrollToEnd()
    },[nowGenerating])

    return (
            <KeyboardAvoidingView style ={styles.chatHistory} >
                <ScrollView         
                    ref={scrollViewRef} 
                    onContentSizeChange={() => {if(nowGenerating)scrollViewRef.current?.scrollToEnd()}} 
                    style={{flex: 1,padding:4}}
                >  
                {messages.slice(1).map((message, index) => (
                    <ChatItem key={index} id={index} message={message} scroll={scrollViewRef}/>
                ))}

                </ScrollView>
            </KeyboardAvoidingView>
        );
}

export {ChatWindow}

const styles = StyleSheet.create({
    chatHistory: {
        flex: 1,
      },

})