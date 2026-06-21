import type { Context } from "@netlify/functions";
import { deconstruct, type SeanceRequest } from "./lib/deconstruct.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: SeanceRequest;
  try {
    body = (await req.json()) as SeanceRequest;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const lang = body.lang === "en" ? "en" : "fr";

  // Opus deconstructs carefully (it stays truthful and shot-specific), often
  // beyond the synchronous proxy's idle timeout. We stream NDJSON: a heartbeat
  // every 3s keeps the connection live, then a final {result|error} line carries
  // the payload. The client reads to end-of-stream and parses the last JSON line.
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = false;
      const beat = setInterval(() => {
        if (!done) {
          try {
            controller.enqueue(enc.encode("\n"));
          } catch {
            /* closed */
          }
        }
      }, 3000);

      try {
        const result = await deconstruct({
          film: body.film,
          director: body.director,
          year: body.year,
          scene: body.scene,
          ask: body.ask,
          lang,
          avoid: Array.isArray(body.avoid) ? body.avoid : [],
        });
        done = true;
        clearInterval(beat);
        controller.enqueue(enc.encode(JSON.stringify({ result }) + "\n"));
      } catch (err) {
        done = true;
        clearInterval(beat);
        const message =
          err instanceof Error
            ? err.message
            : lang === "en"
              ? "Unknown error"
              : "Erreur inconnue";
        controller.enqueue(enc.encode(JSON.stringify({ error: message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
};
