import { DefaultChatRecipient } from "./enum"
import { ChatRecipient } from "./type"


export const defaultRecipient = (recipient: DefaultChatRecipient): ChatRecipient => {

    switch(recipient) {
        case DefaultChatRecipient.HOST:
            return {
                label: 'Host',
                value: 'host'
            }
        default:
            return {
                label: 'Everyone',
                value: 'everyone'
            }
        
    }
}