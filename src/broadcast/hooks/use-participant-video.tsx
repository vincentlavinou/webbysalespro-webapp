'use client'
import { useContext } from "react"
import { ParticipantVideoContext } from "../context/ParticipantVideoContext"


export const useParticipantVideo=()=>{
    const ctx = useContext(ParticipantVideoContext)
    if(!ctx) throw new Error("useParticipantVideo must be used inside ParticipantVideoProvider");
    return ctx
}