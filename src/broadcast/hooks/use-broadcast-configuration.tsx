'use client'
import { useContext } from "react";
import { BroadcastConfigurationContext } from "../context/BroadcastConfigurationContext";


export function useBroadcastConfiguration() {
    const ctx = useContext(BroadcastConfigurationContext)
    if(!ctx) throw new Error("useBroadcastConfiguration is not being used inside BroadcastConfigurationProvider")
    return ctx
}