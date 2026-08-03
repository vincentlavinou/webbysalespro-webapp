"use client";

import type { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { embedAutofillClassName, embedFieldClassName } from "./styles";
import type { AttendeeFormData } from "./schema";

export function AttendeeFields({ control, disabled }: { control: Control<AttendeeFormData>; disabled: boolean }) {
  return <>
    <div className="grid grid-cols-2 gap-3"><TextField control={control} name="first_name" label="First Name" placeholder="Jane" autoComplete="given-name" disabled={disabled} /><TextField control={control} name="last_name" label="Last Name" placeholder="Doe" autoComplete="family-name" disabled={disabled} /></div>
    <TextField control={control} name="email" label="Email Address" placeholder="jane@example.com" type="email" autoComplete="email" disabled={disabled} />
    <TextField control={control} name="phone" label="Phone" placeholder="+1 (555) 000-0000" type="tel" inputMode="tel" autoComplete="tel" disabled={disabled} />
  </>;
}

function TextField({ control, name, label, placeholder, disabled, autoComplete, type = "text", inputMode }: { control: Control<AttendeeFormData>; name: "first_name" | "last_name" | "email" | "phone"; label: string; placeholder: string; disabled: boolean; autoComplete: string; type?: string; inputMode?: "text" | "tel" | "email" | "numeric" }) {
  return <FormField name={name} control={control} render={({ field }) => <FormItem className="gap-1"><FormLabel className="text-gray-700 dark:text-slate-300">{label}</FormLabel><FormControl><Input {...field} type={type} inputMode={inputMode} placeholder={placeholder} disabled={disabled} autoComplete={autoComplete} className={`${embedFieldClassName} ${embedAutofillClassName}`} /></FormControl><FormMessage className="text-xs" /></FormItem>} />;
}
