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

type ApiRequestInit = RequestInit & {
  cacheTtl?: number;
  skipCache?: boolean;
  cacheKey?: string;
};

type CacheEntry = { ts: number; data: unknown };

const DEFAULT_CACHE_TTL = 30_000;
const memoryCache = new Map<string, CacheEntry>();
const inflightCache = new Map<string, Promise<unknown>>();

function resolveMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method;
  if (input instanceof Request) return input.method;
  return "GET";
}

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return String(input);
}

export async function apiRequest<T>(input: RequestInfo | URL, init?: ApiRequestInit): Promise<T> {
  const { cacheTtl = DEFAULT_CACHE_TTL, skipCache = false, cacheKey, ...fetchInit } = init || {};
  const method = resolveMethod(input, fetchInit).toUpperCase();
  const isGet = method === "GET";
  const key = cacheKey || `${method}:${resolveUrl(input)}`;

  if (isGet && !skipCache && cacheTtl > 0) {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.ts < cacheTtl) {
      return cached.data as T;
    }
    const inflight = inflightCache.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const fetchPromise = (async () => {
    const response = await fetch(input, {
      ...fetchInit,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(fetchInit?.headers || {}),
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

    if (!response.ok || !payload?.ok) {
      const message = payload && "error" in payload ? payload.error?.message : undefined;
      const code = payload && "error" in payload ? payload.error?.code : undefined;
      throw new ApiError(response.status, code || "request_failed", message || "Request failed");
    }

    if (isGet && !skipCache && cacheTtl > 0) {
      memoryCache.set(key, { ts: Date.now(), data: payload.data });
    } else if (!isGet) {
      memoryCache.clear();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }
    }

    return payload.data;
  })();

  if (isGet && !skipCache && cacheTtl > 0) {
    inflightCache.set(key, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (isGet && !skipCache && cacheTtl > 0) {
      inflightCache.delete(key);
    }
  }
}
