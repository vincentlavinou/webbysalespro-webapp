import { z } from 'zod'

// Mirrors the phone validation on the registration page so a guest claiming
// their identity mid-stream meets the same bar as a normal registrant.
const PHONE_ALLOWED_CHARACTERS = /^[+\d\s().-]+$/
const PHONE_EXTENSION_PATTERN = /\s*(?:ext\.?|x)\s*\d+$/i

const isValidPhoneNumber = (value: string) => {
    const normalizedValue = value.replace(PHONE_EXTENSION_PATTERN, '')
    const plusCount = (normalizedValue.match(/\+/g) || []).length

    if (plusCount > 1 || (plusCount === 1 && !normalizedValue.startsWith('+'))) {
        return false
    }

    if (!PHONE_ALLOWED_CHARACTERS.test(normalizedValue)) {
        return false
    }

    const digits = normalizedValue.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
}

export const claimRegistrantSchema = z.object({
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().trim().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z
        .string()
        .trim()
        .min(1, 'Phone number is required')
        .refine(isValidPhoneNumber, 'Enter a valid phone number'),
})

export type ClaimRegistrantFormData = z.infer<typeof claimRegistrantSchema>
