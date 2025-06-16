'use client'
import { useContext } from "react"
import { LocalMediaContext } from "../context/LocalMediaContext"


export const useLocalMedia = () => {
    const ctx = useContext(LocalMediaContext)
    if (!ctx) throw new Error("useLocalMedia must be used inside LocalMediaContext");
    return ctx;
};
