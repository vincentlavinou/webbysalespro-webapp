import { useContext } from "react";
import { ChatConfigurationContext } from "../context/ChatConfigurationContext";


export function useChatConfiguration() {
    const ctx = useContext(ChatConfigurationContext)
    if(!ctx) throw Error("useChatConfiguration is not being used inside ChatConfigurationProvider")
    return ctx
}