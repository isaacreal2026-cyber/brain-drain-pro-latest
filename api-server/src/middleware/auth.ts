import type { NextFunction, Request, Response } from "express";
import { extractBearerToken, verifyFirebaseToken, type VerifiedAuth } from "../lib/firebase-auth";

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: VerifiedAuth;
    }
  }
}

/**
 * Requires a valid Firebase ID token. Responds 401 when missing or invalid.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req.headers.authorization);
  try {
    req.auth = await verifyFirebaseToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

/**
 * Attaches the authenticated user if a valid token is present, but allows
 * anonymous/guest access otherwise. Use for public read endpoints that can
 * personalize responses when a user is signed in.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    try {
      req.auth = await verifyFirebaseToken(token);
    } catch {
      // Ignore invalid tokens for optional auth; the request proceeds as guest.
    }
  }
  next();
}
