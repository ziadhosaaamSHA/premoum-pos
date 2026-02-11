export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { code?: string; message?: string } };

export async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.ok) {
    const message = payload && "error" in payload ? payload.error?.message : undefined;
    const code = payload && "error" in payload ? payload.error?.code : undefined;
    throw new ApiError(response.status, code || "request_failed", message || "Request failed");
  }

  return payload.data;
}
