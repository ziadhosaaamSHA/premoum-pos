import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/guards";
import { jsonError } from "@/server/http";
import { buildNotificationsForUser } from "@/server/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth(request);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;

        const sendUpdate = async () => {
          if (closed) return;
          try {
            const notifications = await buildNotificationsForUser(user);
            const payload = JSON.stringify({ notifications, ts: new Date().toISOString() });
            controller.enqueue(encoder.encode(`event: update\ndata: ${payload}\n\n`));
          } catch {
            const payload = JSON.stringify({ message: "refresh_failed" });
            controller.enqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
          }
        };

        void sendUpdate();
        const interval = setInterval(() => {
          void sendUpdate();
        }, 10_000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
