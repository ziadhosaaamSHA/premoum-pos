import { ZodSchema } from "zod";
import { NextRequest, NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }

  console.error(error);
  return NextResponse.json(
    { ok: false, error: { code: "internal_error", message: "Unexpected server error" } },
    { status: 500 }
  );
}

export async function readJson<T>(request: NextRequest, schema: ZodSchema<T>) {
  const payload = await request.json().catch(() => {
    throw new HttpError(400, "invalid_json", "Invalid request body");
  });
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new HttpError(400, "invalid_payload", result.error.issues[0]?.message || "Invalid payload");
  }
  return result.data;
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function getRequestOrigin(request: NextRequest) {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}
