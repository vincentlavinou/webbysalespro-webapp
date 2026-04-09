'use server';

import { actionClient, ServerError } from "@/lib/safe-action";
import { handleStatus } from "@/lib/http";
import { attendeeFetch } from "@/lib/attendee-fetch";
import { z } from "zod";
import { broadcastApiUrl } from ".";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken } from "./type";

const createBroadcastServiceTokenSchema = z.object({
  sessionId: z.string(),
});

const setMainPresenterSchema = z.object({
  webinarId: z.string(),
  sessionId: z.string().optional(),
  presenterId: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const sessionControllerSchema = z.object({
  action: z.string(),
  seriesId: z.string(),
  sessionId: z.string(),
  body: z.record(z.string(), z.unknown()),
  headers: z.record(z.string(), z.string()).optional(),
});

const recordEventSchema = z.object({
  name: z.string(),
  attendanceId: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function unwrapActionData<T>(result: {
  data?: T;
  serverError?: ServerError;
  validationErrors?: unknown;
}): T {
  if (result.serverError) {
    throw new Error(result.serverError.detail);
  }

  if (result.validationErrors) {
    throw new Error("Invalid request payload.");
  }

  if (result.data === undefined) {
    throw new Error("Unexpected empty response from server action.");
  }

  return result.data;
}

export const createBroadcastServiceTokenAction = actionClient
  .inputSchema(createBroadcastServiceTokenSchema)
  .action(async ({ parsedInput }) => {
    const response = await attendeeFetch(`${broadcastApiUrl}/v1/broadcast/token/`, {
      method: "POST",
      body: JSON.stringify({ session: parsedInput.sessionId }),
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as BroadcastServiceToken;
  });

export const createAttendeeBroadcastServiceTokenAction = actionClient
  .inputSchema(createBroadcastServiceTokenSchema)
  .action(async ({ parsedInput }) => {
    const response = await attendeeFetch(`${broadcastApiUrl}/v1/attendee/broadcast/token/`, {
      method: "POST",
      body: JSON.stringify({ session: parsedInput.sessionId }),
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as AttendeeBroadcastServiceToken;
  });

export const setMainPresenterAction = actionClient
  .inputSchema(setMainPresenterSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(
      `${broadcastApiUrl}/v1/webinars/${parsedInput.webinarId}/sessions/${parsedInput.sessionId}/set-main-presenter/`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(parsedInput.headers ?? {}),
        },
        method: "POST",
        body: JSON.stringify({
          presenter_id: parsedInput.presenterId,
        }),
      }
    );

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as BroadcastServiceToken;
  });

export const sessionControllerAction = actionClient
  .inputSchema(sessionControllerSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(
      `${broadcastApiUrl}/v1/series/${parsedInput.seriesId}/sessions/${parsedInput.sessionId}/${parsedInput.action}/`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(parsedInput.headers ?? {}),
        },
        method: "PATCH",
        body: JSON.stringify(parsedInput.body),
      }
    );

    await handleStatus(response);
    return { success: true };
  });

export const recordEventAction = actionClient
  .inputSchema(recordEventSchema)
  .action(async ({ parsedInput }) => {
    const response = await attendeeFetch(
      `${broadcastApiUrl}/v2/attendances/${parsedInput.attendanceId}/events/`,
      {
        method: "POST",
        body: JSON.stringify({
          event_code: parsedInput.name,
          source: "client",
          occurred_at: new Date().toISOString(),
          payload: parsedInput.payload ?? {},
        }),
      }
    );

    await handleStatus(response);
    return { success: true };
  });

export const createBroadcastServiceToken = async (
  webinarId: string,
): Promise<BroadcastServiceToken> => {
  const result = await createBroadcastServiceTokenAction({
    sessionId: webinarId,
  });

  return unwrapActionData(result);
};

export const createAttendeeBroadcastServiceToken = async (
  webinarId: string,
): Promise<AttendeeBroadcastServiceToken> => {
  const result = await createAttendeeBroadcastServiceTokenAction({
    sessionId: webinarId,
  });

  return unwrapActionData(result);
};

export const setMainPresenter = async (
  webinarId: string,
  sessionId?: string,
  presenterId?: string,
  headers?: Record<string, string>
): Promise<BroadcastServiceToken> => {
  const result = await setMainPresenterAction({
    webinarId,
    sessionId,
    presenterId,
    headers,
  });

  return unwrapActionData(result);
};

export const sessionController = async (
  action: string,
  seriesId: string,
  sessionId: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
) => {
  const result = await sessionControllerAction({
    action,
    seriesId,
    sessionId,
    body,
    headers,
  });

  unwrapActionData(result);
};

export const recordEvent = async (
  name: string,
  attendanceId: string,
  payload: Record<string, unknown> | undefined = undefined
) => {
  const result = await recordEventAction({
    name,
    attendanceId,
    payload,
  });

  unwrapActionData(result);
};
