import type { CSSProperties } from "react";

export const embedFieldClassName =
  "!border-gray-200 !bg-white !text-gray-900 placeholder:!text-gray-400 shadow-none dark:!border-slate-600 dark:!bg-slate-900 dark:!text-slate-100 dark:placeholder:!text-slate-500";

export const embedAutofillClassName =
  "[&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#111827] [&:-webkit-autofill]:[caret-color:#111827] [&:-webkit-autofill:hover]:[box-shadow:0_0_0px_1000px_white_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0px_1000px_white_inset] dark:[&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#f8fafc] dark:[&:-webkit-autofill]:[caret-color:#f8fafc] dark:[&:-webkit-autofill:hover]:[box-shadow:0_0_0px_1000px_#0f172a_inset] dark:[&:-webkit-autofill:focus]:[box-shadow:0_0_0px_1000px_#0f172a_inset]";

export const panelTone = (accent: string, backgroundColor?: string): CSSProperties => ({
  borderColor: `${accent}33`,
  backgroundColor: backgroundColor ?? `${accent}11`,
});

export const buttonTone = (backgroundColor?: string, color?: string): CSSProperties | undefined => {
  if (!backgroundColor && !color) return undefined;
  return { ...(backgroundColor ? { backgroundColor } : {}), ...(color ? { color } : {}) };
};
