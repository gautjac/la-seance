import type { Deconstruction, SeanceRequest } from "./types";

/**
 * /api/seance is Opus-backed and can run ~30–55s — longer than the proxy's idle
 * timeout. The function streams NDJSON: bare-newline heartbeats keep the socket
 * alive, then a final JSON line carries { result } or { error }. We read the
 * whole stream and parse the LAST non-empty line. (Falls back to plain JSON.)
 */
export async function fetchSeance(req: SeanceRequest): Promise<Deconstruction> {
  const res = await fetch("/api/seance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const raw = await res.text();
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1] ?? "";

  let parsed: { result?: Deconstruction; error?: string } | Deconstruction | null = null;
  try {
    parsed = last ? JSON.parse(last) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg =
      parsed && "error" in parsed && parsed.error ? parsed.error : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  if (!parsed) throw new Error("Réponse invalide du serveur.");
  if ("error" in parsed && parsed.error) throw new Error(parsed.error);
  if ("result" in parsed && parsed.result) return parsed.result;
  if ("beats" in parsed && "film" in parsed) return parsed as unknown as Deconstruction;
  throw new Error("Réponse invalide du serveur.");
}
