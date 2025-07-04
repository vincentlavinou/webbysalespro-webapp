'use client'
import { useContext } from 'react'
import { WebinarContext } from '../context/WebinarContext'

export const useWebinar = () => {
    const ctx = useContext(WebinarContext)
    if(!ctx) throw new Error('useWebinar must be used within a WebinarProvider')
    return ctx
}