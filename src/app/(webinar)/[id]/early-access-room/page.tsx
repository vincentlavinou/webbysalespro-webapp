'use client'
import { useWebinar } from "@/webinar/hooks";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { redirect } from "next/navigation";
import { useEffect } from "react";


export default function EarlyAccessRoomPage() {
    
    const {session, sessionId, token} = useWebinar()

    

    useEffect(() => {
        if(session?.status === WebinarSessionStatus.IN_PROGRESS) {
            redirect(`/${sessionId}/live?token=${token}`)
        }
    },[session, token, sessionId])
    
    return (
        <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-2xl font-bold text-center my-8">Early Access Room</h1>
        <p className="text-center text-gray-600">You will be redirected to the waiting room shortly...</p>
        </div>
    );
}