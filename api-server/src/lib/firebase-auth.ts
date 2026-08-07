/**
 * Firebase ID token verification using Node's built-in WebCrypto.
 * No external JWT dependency — Firebase tokens are RS256 and we only need
 * to verify the signature and standard claims.
 *
 * Public keys are fetched from Google's JWKS endpoint and cached according
 * to the Cache-Control max-age header.
 */

import { config } from "./config";

interface DecodedToken {
  header: {
    alg: string;
    kid: string;
    typ: string;
  };
  payload: {
    iss: string;
    aud: string;
    sub: string;
    iat: number;
    exp: number;
    auth_time?: number;
    email?: string;
    name?: string;
    picture?: string;
    firebase?: {
      sign_in_provider?: string;
    };
    [key: string]: unknown;
  };
  signature: Uint8Array;
  signingInput: string;
}

export interface VerifiedAuth {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

interface CachedKey {
  key: CryptoKey;
  expiresAt: number;
}

const keyCache = new Map<string, CachedKey>();
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com";
const ALLOWED_CLOCK_SKEW_MS = 5 * 1000;

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  return Uint8Array.from(
    atob(padded + padding),
    (c) => c.charCodeAt(0),
  );
}

function decodeToken(token: string): DecodedToken {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token: expected 3 segments");
  }

  const headerBytes = base64UrlDecode(parts[0]);
  const payloadBytes = base64UrlDecode(parts[1]);
  const signature = base64UrlDecode(parts[2]);

  const header = JSON.parse(new TextDecoder().decode(headerBytes));
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

  return {
    header,
    payload,
    signature,
    signingInput: `${parts[0]}.${parts[1]}`,
  };
}

function parseCacheControlMaxAge(header: string | null): number {
  if (!header) return 3600;
  const match = /max-age=(\d+)/i.exec(header);
  return match ? Number(match[1]) : 3600;
}

async function fetchPublicKey(kid: string): Promise<CryptoKey> {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const response = await fetch(FIREBASE_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${response.status}`);
  }

  const maxAge = parseCacheControlMaxAge(
    response.headers.get("cache-control"),
  );
  const { keys } = (await response.json()) as {
    keys: Array<JsonWebKey & { kid: string }>;
  };

  for (const jwk of keys) {
    if (!jwk.kid) continue;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    keyCache.set(jwk.kid, {
      key: publicKey,
      expiresAt: Date.now() + maxAge * 1000,
    });
  }

  const next = keyCache.get(kid);
  if (!next) {
    throw new Error(`Firebase public key not found for kid: ${kid}`);
  }
  return next.key;
}

function verifyClaims(decoded: DecodedToken): VerifiedAuth {
  const { payload } = decoded;
  const now = Math.floor(Date.now() / 1000);
  const projectId = config.firebase.projectId;

  if (!projectId) {
    throw new Error("Firebase project ID is not configured");
  }

  if (decoded.header.alg !== "RS256") {
    throw new Error(`Unsupported token algorithm: ${decoded.header.alg}`);
  }

  if (payload.aud !== projectId) {
    throw new Error("Token audience does not match the Firebase project");
  }

  const issuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== issuer) {
    throw new Error("Token issuer does not match the Firebase project");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Token has no subject");
  }

  if (payload.exp + ALLOWED_CLOCK_SKEW_MS / 1000 < now) {
    throw new Error("Token has expired");
  }

  if (payload.iat - ALLOWED_CLOCK_SKEW_MS / 1000 > now) {
    throw new Error("Token issued in the future");
  }

  return {
    uid: payload.sub,
    email: payload.email,
    displayName: payload.name,
    photoURL: payload.picture,
  };
}

export async function verifyFirebaseToken(
  token: string | undefined | null,
): Promise<VerifiedAuth> {
  if (!token) {
    throw new Error("Missing authentication token");
  }

  const decoded = decodeToken(token);
  const publicKey = await fetchPublicKey(decoded.header.kid);

  const signingInputBytes = new TextEncoder().encode(decoded.signingInput);
  // Copy the signature into a fresh ArrayBuffer-backed Uint8Array to satisfy
  // the strict BufferSource typing.
  const signatureBytes = new Uint8Array(decoded.signature.byteLength);
  signatureBytes.set(decoded.signature);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signatureBytes,
    signingInputBytes,
  );

  if (!valid) {
    throw new Error("Invalid token signature");
  }

  return verifyClaims(decoded);
}

/** Extracts a Bearer token from the Authorization header. */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  return match ? match[1] : null;
}
