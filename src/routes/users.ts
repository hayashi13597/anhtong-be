import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { users } from "../db/schema";
import type { Env } from "../index";
import { adminMiddleware, authMiddleware } from "../lib/auth";
import { createDb } from "../lib/db";

type Variables = {
  user: {
    id: number;
    username: string;
    region: string;
    isAdmin: boolean;
  };
};

const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all users in the same region (admin only)
usersRouter.get("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");

  const usersList = await db.query.users.findMany({
    where: eq(users.region, user.region as "vn" | "na"),
    columns: {
      id: true,
      username: true,
      classes: true,
      role: true,
      region: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return c.json(usersList);
});

// Get single user
usersRouter.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const userId = parseInt(c.req.param("id"));

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      classes: true,
      role: true,
      region: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

// Update user profile (own profile or admin can update others in same region)
usersRouter.put("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const currentUser = c.get("user");
  const userId = parseInt(c.req.param("id"));
  const { classes, role } = await c.req.json<{
    classes?: string;
    role?: "dps" | "healer" | "tank";
  }>();

  // Check permission: own profile or admin for same region
  if (currentUser.id !== userId) {
    if (!currentUser.isAdmin) {
      return c.json({ error: "Cannot update other users" }, 403);
    }

    // Admin can only update users in their region
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser || targetUser.region !== currentUser.region) {
      return c.json({ error: "User not found or in different region" }, 404);
    }
  }

  if (role && !["dps", "healer", "tank"].includes(role)) {
    return c.json({ error: "Role must be 'dps', 'healer', or 'tank'" }, 400);
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...(classes !== undefined && { classes }),
      ...(role && { role }),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      classes: users.classes,
      role: users.role,
      region: users.region,
      isAdmin: users.isAdmin,
    });

  return c.json(updatedUser);
});

// Delete user (admin only)
usersRouter.delete("/:id", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const currentUser = c.get("user");
  const userId = parseInt(c.req.param("id"));
  // Admin can only delete users in their region
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!targetUser || targetUser.region !== currentUser.region) {
    return c.json({ error: "User not found or in different region" }, 404);
  }
  await db.delete(users).where(eq(users.id, userId));
  return c.json({ message: "User deleted successfully" });
});

export default usersRouter;
