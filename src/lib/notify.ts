'use client'

import toast from "react-hot-toast"
import type { ServerError } from "./safe-action"

type ErrorInput = ServerError | string | undefined | null

function extractMessage(input: ErrorInput): string | undefined {
    if (!input) return undefined
    if (typeof input === "string") return input || undefined
    return input.detail || undefined
}

export function notifyErrorUi(e: Error, overrideMessage: string | undefined = undefined) {
    toast.error(e.message || overrideMessage || "Something went wrong on our side, please try again or contact us.")
}

export function notifyErrorUiMessage(errorMessage: ErrorInput, overrideMessage: string | undefined = undefined) {
    toast.error(extractMessage(errorMessage) || overrideMessage || "Something went wrong on our side, please try again or contact us.")
}

export function notifySuccessUiMessage(message: string) {
    toast.success(message)
}
