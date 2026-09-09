import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppRole } from "../generated/prisma/client";
import { config } from "../config";

export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  roles: AppRole[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "30d" });
}

// Verifies the JWT on the Authorization: Bearer <token> header and attaches
// the decoded payload to req.auth. Does NOT check roles — see requireRole.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    req.auth = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Usage: router.post("/trips", requireAuth, requireRole("ADMIN", "SKIPPER"), handler)
// A user with ANY of the listed roles is allowed through.
export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const hasRole = req.auth.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        error: `Requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }

    return next();
  };
}
