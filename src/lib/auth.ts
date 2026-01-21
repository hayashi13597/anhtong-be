import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

// Simple token-based auth (in production, use JWT or similar)
// Token format: base64(userId:username:region:isAdmin)
export function generateToken(user: {
  id: number;
  username: string;
  region: string;
  isAdmin: boolean;
}): string {
  const payload = `${user.id}:${user.username}:${user.region}:${user.isAdmin}`;
  return btoa(payload);
}

export function parseToken(token: string): {
  id: number;
  username: string;
  region: string;
  isAdmin: boolean;
} | null {
  try {
    const decoded = atob(token);
    const [id, username, region, isAdmin] = decoded.split(":");
    return {
      id: parseInt(id),
      username,
      region,
      isAdmin: isAdmin === "true",
    };
  } catch {
    return null;
  }
}

// Auth middleware
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const user = parseToken(token);

    if (!user) {
      throw new HTTPException(401, { message: "Invalid token" });
    }

    c.set("user", user);
    await next();
  };
}

// Admin-only middleware
export function adminMiddleware() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user || !user.isAdmin) {
      throw new HTTPException(403, { message: "Admin access required" });
    }
    await next();
  };
}

// Simple password hashing (in production, use bcrypt or argon2)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
