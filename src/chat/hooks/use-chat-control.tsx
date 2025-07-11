'use client'
import { useContext } from "react";
import { ChatControlContext } from "../context/ChatControlContext";


export function useChatControl() {
    const ctx = useContext(ChatControlContext)
    if(!ctx) throw new Error("useChatControl is not being used inside ChatControlProvider")
    return ctx
}