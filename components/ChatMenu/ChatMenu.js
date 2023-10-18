import { View, } from 'react-native'
import React from 'react'

import { ChatWindow } from './ChatWindow/ChatWindow'


const ChatMenu = ({messages, userImage, botImage}) => {
  return (
    <View style ={{flex:1, marginBottom:2, marginTop:2}}>
        <ChatWindow messages={messages} botImage={botImage} userImage={botImage}/>
    </View>
    
  )
}

export default ChatMenu