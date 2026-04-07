export type AudienceRole = "host" | "presenter" | "attendee";

export type AudienceEvent<
  TType extends string = string,
  TPayload = Record<string, unknown>,
> = {
  type: TType;
  version: number;
  session_id: string;
  event_key: string;
  emitted_at: string;
  audience: AudienceRole[];
  payload: TPayload;
};
