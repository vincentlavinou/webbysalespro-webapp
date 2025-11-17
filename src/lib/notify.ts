'use client'

import toast from "react-hot-toast"

export function notifyErrorUi(e: Error, overrideMessage: string | undefined = undefined) {
    toast.error(e.message || overrideMessage || "Something went wrong on our side, please try again or contact us.")
}

export function notifyErrorUiMessage(errorMessage: string | undefined, overrideMessage: string | undefined = undefined) {
    toast.error(errorMessage || overrideMessage || "Something went wrong on our side, please try again or contact us.")
}