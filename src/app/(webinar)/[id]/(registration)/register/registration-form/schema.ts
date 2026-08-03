import { z } from "zod";

const PHONE_ALLOWED_CHARACTERS = /^[+\d\s().-]+$/;
const PHONE_EXTENSION_PATTERN = /\s*(?:ext\.?|x)\s*\d+$/i;

function isValidPhoneNumber(value: string) {
  const normalizedValue = value.replace(PHONE_EXTENSION_PATTERN, "");
  const plusCount = (normalizedValue.match(/\+/g) || []).length;

  if (plusCount > 1 || (plusCount === 1 && !normalizedValue.startsWith("+"))) return false;
  if (!PHONE_ALLOWED_CHARACTERS.test(normalizedValue)) return false;

  const digits = normalizedValue.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export const attendeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().trim().min(1, "Phone number is required").refine(isValidPhoneNumber, "Enter a valid phone number"),
  session_id: z.string().uuid({ message: "Please select a session" }).optional(),
});

export type AttendeeFormData = z.infer<typeof attendeeSchema>;
