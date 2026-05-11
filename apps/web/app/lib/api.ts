export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type APIErrorBody = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};

export class APIRequestError extends Error {
  status: number;
  code?: string;
  requestID?: string;

  constructor(message: string, status: number, code?: string, requestID?: string) {
    super(message);
    this.name = "APIRequestError";
    this.status = status;
    this.code = code;
    this.requestID = requestID;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as APIErrorBody;
    throw new APIRequestError(
      body.error?.message ?? "Request failed",
      response.status,
      body.error?.code,
      body.error?.request_id,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof APIRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
