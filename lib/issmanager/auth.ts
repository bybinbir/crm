/**
 * Token cache and refresh for the ISS Manager v2 client_credentials flow.
 *
 * The provider does NOT support refresh tokens (per brief / OpenAPI). When a
 * token is near expiry we re-run client_credentials. Cache lives in-process
 * memory; in a multi-instance prod setup every replica refreshes
 * independently, which is fine — the upstream is happy with concurrent
 * client_credentials posts.
 *
 * Edge / browser usage is forbidden: we read the client secret from env, so
 * importing this module client-side would crash. The module is server-only.
 */
import { z } from "zod";
import { config } from "@/lib/config";
import { envelope, TokenSchema, type Token } from "./types";
import { AuthError, NetworkError, ParseError } from "./errors";

const TokenEnvelopeSchema = envelope(TokenSchema);

/** Refresh slightly before expiry to avoid races. */
const SAFETY_WINDOW_MS = 60_000;

type CachedToken = {
  token: Token;
  /** Epoch ms when we should refresh. */
  refreshAt: number;
};

let cache: CachedToken | undefined;
let inflight: Promise<Token> | undefined;

/**
 * Returns a valid Bearer token, refreshing if needed. Concurrent callers
 * share a single in-flight request to avoid stampedes.
 */
export async function getToken(): Promise<Token> {
  const now = Date.now();
  if (cache && cache.refreshAt > now) return cache.token;
  if (inflight) return inflight;

  inflight = fetchTokenFresh().finally(() => {
    inflight = undefined;
  });
  return inflight;
}

/**
 * Drop the cached token. Used in tests and after an upstream 401 forces a
 * re-auth on the next call.
 */
export function invalidateToken(): void {
  cache = undefined;
}

async function fetchTokenFresh(): Promise<Token> {
  const cfg = config.issmanager;
  const url = `${cfg.baseUrl}/iss/v2/auth/token`;
  const auth =
    "Basic " + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    throw new NetworkError(
      "Failed to reach ISS Manager token endpoint",
      url,
      { cause: e }
    );
  }

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new AuthError(
      `Token endpoint returned HTTP ${res.status} ${res.statusText}`,
      { cause: { status: res.status, body } }
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    throw new ParseError({
      url,
      issues: "token response was not valid JSON",
      cause: e,
    });
  }

  const parsed = TokenEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    throw new ParseError({
      url,
      issues: zodIssues(parsed.error),
    });
  }

  const token = parsed.data.data;
  cache = {
    token,
    refreshAt: Date.now() + token.expires_in * 1000 - SAFETY_WINDOW_MS,
  };
  return token;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

function zodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/** Test hook — reset cache and any in-flight fetch state. */
export function __resetAuthForTests(): void {
  cache = undefined;
  inflight = undefined;
}
