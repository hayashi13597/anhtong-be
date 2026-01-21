import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { eventSignups, events, users } from "../db/schema";
import type { Env } from "../index";
import { authMiddleware, generateToken, verifyPassword } from "../lib/auth";
import { createDb } from "../lib/db";
import { getCurrentWeekMonday } from "../lib/utils";

type Variables = {
  user: {
    id: number;
    username: string;
    region: string;
    isAdmin: boolean;
  };
};

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// Admin login endpoint (only admins need to login)
auth.post("/login", async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || !password) {
    return c.json({ error: "Username and password are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user || !user.password || !user.isAdmin) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = generateToken({
    id: user.id,
    username: user.username,
    region: user.region,
    isAdmin: user.isAdmin ?? false,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      region: user.region,
      isAdmin: user.isAdmin,
    },
  });
});

// Event signup - regular users fill form to participate in current week's event
auth.post("/signup", async (c) => {
  const body = await c.req.json<{
    username: string;
    classes?: string;
    role?: "dps" | "healer" | "tank";
    region: "vn" | "na";
  }>();

  const { username, classes, role, region } = body;

  if (!username || !region) {
    return c.json({ error: "Username and region are required" }, 400);
  }

  if (!["vn", "na"].includes(region)) {
    return c.json({ error: "Region must be 'vn' or 'na'" }, 400);
  }

  if (role && !["dps", "healer", "tank"].includes(role)) {
    return c.json({ error: "Role must be 'dps', 'healer', or 'tank'" }, 400);
  }

  const db = createDb(c.env.DB);
  const monday = getCurrentWeekMonday();

  // Get current week's event for this region
  const event = await db.query.events.findFirst({
    where: and(eq(events.region, region), eq(events.weekStartDate, monday)),
  });

  if (!event) {
    return c.json({ error: "No event available for this week" }, 404);
  }

  // Check if user already exists
  let user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (user) {
    // User exists - update their info if provided
    if (classes !== undefined || role) {
      [user] = await db
        .update(users)
        .set({
          ...(classes !== undefined && { classes }),
          ...(role && { role }),
        })
        .where(eq(users.id, user.id))
        .returning();
    }

    // Check if user's region matches
    if (user.region !== region) {
      return c.json(
        { error: "Username already exists in a different region" },
        409,
      );
    }
  } else {
    // Create new user (no password for regular users)
    [user] = await db
      .insert(users)
      .values({
        username,
        password: null,
        classes: classes || null,
        role: role || null,
        region,
        isAdmin: false,
      })
      .returning();
  }

  // Check if already signed up for this event
  const existingSignup = await db.query.eventSignups.findFirst({
    where: and(
      eq(eventSignups.eventId, event.id),
      eq(eventSignups.userId, user.id),
    ),
  });

  if (existingSignup) {
    return c.json({
      message: "Already signed up for this event",
      user: {
        id: user.id,
        username: user.username,
        region: user.region,
        classes: user.classes,
        role: user.role,
      },
      event: {
        id: event.id,
        weekStartDate: event.weekStartDate,
      },
    });
  }

  // Create event signup
  await db.insert(eventSignups).values({
    eventId: event.id,
    userId: user.id,
  });

  return c.json(
    {
      message: "Successfully signed up for the event",
      user: {
        id: user.id,
        username: user.username,
        region: user.region,
        classes: user.classes,
        role: user.role,
      },
      event: {
        id: event.id,
        weekStartDate: event.weekStartDate,
      },
    },
    201,
  );
});

// Get current user profile (admin only)
auth.get("/me", authMiddleware(), async (c) => {
  const currentUser = c.get("user");
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({
    id: user.id,
    username: user.username,
    region: user.region,
    classes: user.classes,
    role: user.role,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  });
});

export default auth;
