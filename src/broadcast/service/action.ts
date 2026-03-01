'use server';

import { actionClient } from "@/lib/safe-action";
import { handleStatus } from "@/lib/http";
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { z } from "zod";
import { broadcastApiUrl } from ".";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken } from "./type";

const headersSchema = z.record(z.string(), z.string()).optional();

const createBroadcastServiceTokenSchema = z.object({
  sessionId: z.string(),
  accessToken: z.string().optional(),
  headers: headersSchema,
});

const setMainPresenterSchema = z.object({
  webinarId: z.string(),
  sessionId: z.string().optional(),
  presenterId: z.string().optional(),
  headers: headersSchema,
});

const sessionControllerSchema = z.object({
  action: z.string(),
  seriesId: z.string(),
  sessionId: z.string(),
  body: z.record(z.string(), z.unknown()),
  headers: headersSchema,
});

const recordEventSchema = z.object({
  name: z.string(),
  sessionId: z.string(),
  token: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function normalizeHeaders(headers?: RequestHeaders): Record<string, string> | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function unwrapActionData<T>(result: {
  data?: T;
  serverError?: string;
  validationErrors?: unknown;
}): T {
  if (result.serverError) {
    throw new Error(result.serverError);
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
    const response = await fetch(`${broadcastApiUrl}/v1/broadcast/token/`, {
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
      method: "POST",
      body: JSON.stringify({
        session: parsedInput.sessionId,
        access_token: parsedInput.accessToken,
      }),
    });

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as BroadcastServiceToken;
  });

export const createAttendeeBroadcastServiceTokenAction = actionClient
  .inputSchema(createBroadcastServiceTokenSchema)
  .action(async ({ parsedInput }) => {
    const response = await fetch(`${broadcastApiUrl}/v1/attendee/broadcast/token/`, {
      headers: {
        "Content-Type": "application/json",
        ...(parsedInput.headers ?? {}),
      },
      method: "POST",
      body: JSON.stringify({
        session: parsedInput.sessionId,
        access_token: parsedInput.accessToken,
      }),
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
    const params = new URLSearchParams();
    params.set("token", parsedInput.token);

    const response = await fetch(`${broadcastApiUrl}/v1/sessions/${parsedInput.sessionId}/events/?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        event_type: parsedInput.name,
        event_timestamp: new Date().toISOString(),
        payload: parsedInput.payload,
      }),
    });

    await handleStatus(response);
    return { success: true };
  });

export const createBroadcastServiceToken = async (
  webinarId: string,
  accessToken?: string,
  headers?: RequestHeaders
): Promise<BroadcastServiceToken> => {
  const result = await createBroadcastServiceTokenAction({
    sessionId: webinarId,
    accessToken,
    headers: normalizeHeaders(headers),
  });

  return unwrapActionData(result);
};

export const createAttendeeBroadcastServiceToken = async (
  webinarId: string,
  accessToken?: string,
  headers?: RequestHeaders
): Promise<AttendeeBroadcastServiceToken> => {
  const result = await createAttendeeBroadcastServiceTokenAction({
    sessionId: webinarId,
    accessToken,
    headers: normalizeHeaders(headers),
  });

  return unwrapActionData(result);
};

export const setMainPresenter = async (
  webinarId: string,
  sessionId?: string,
  presenterId?: string,
  headers?: RequestHeaders
): Promise<BroadcastServiceToken> => {
  const result = await setMainPresenterAction({
    webinarId,
    sessionId,
    presenterId,
    headers: normalizeHeaders(headers),
  });

  return unwrapActionData(result);
};

export const sessionController = async (
  action: string,
  seriesId: string,
  sessionId: string,
  body: Record<string, unknown>,
  requestHeaders: () => Promise<RequestHeaders | undefined>
) => {
  const result = await sessionControllerAction({
    action,
    seriesId,
    sessionId,
    body,
    headers: normalizeHeaders(await requestHeaders()),
  });

  unwrapActionData(result);
};

export const recordEvent = async (
  name: string,
  sessionId: string,
  token: string,
  payload: Record<string, unknown> | undefined = undefined
) => {
  const result = await recordEventAction({
    name,
    sessionId,
    token,
    payload,
  });

  unwrapActionData(result);
};
