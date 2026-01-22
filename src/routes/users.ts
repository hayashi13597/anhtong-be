import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { ClassType } from "../db/schema";
import { classEnum, users } from "../db/schema";
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
      primaryClass: true,
      secondaryClass: true,
      primaryRole: true,
      secondaryRole: true,
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
      primaryClass: true,
      secondaryClass: true,
      primaryRole: true,
      secondaryRole: true,
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
  const { primaryClass, secondaryClass, primaryRole, secondaryRole } =
    await c.req.json<{
      primaryClass?: [ClassType, ClassType];
      secondaryClass?: [ClassType, ClassType];
      primaryRole?: "dps" | "healer" | "tank";
      secondaryRole?: "dps" | "healer" | "tank";
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

  if (primaryClass) {
    if (!Array.isArray(primaryClass) || primaryClass.length !== 2) {
      return c.json(
        { error: "Primary class must be an array of exactly 2 classes" },
        400,
      );
    }
    if (!primaryClass.every((cls) => classEnum.includes(cls))) {
      return c.json({ error: "Invalid primary class" }, 400);
    }
  }

  if (secondaryClass) {
    if (!Array.isArray(secondaryClass) || secondaryClass.length !== 2) {
      return c.json(
        { error: "Secondary class must be an array of exactly 2 classes" },
        400,
      );
    }
    if (!secondaryClass.every((cls) => classEnum.includes(cls))) {
      return c.json({ error: "Invalid secondary class" }, 400);
    }
  }

  if (primaryRole && !["dps", "healer", "tank"].includes(primaryRole)) {
    return c.json(
      { error: "Primary role must be 'dps', 'healer', or 'tank'" },
      400,
    );
  }

  if (secondaryRole && !["dps", "healer", "tank"].includes(secondaryRole)) {
    return c.json(
      { error: "Secondary role must be 'dps', 'healer', or 'tank'" },
      400,
    );
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...(primaryClass !== undefined && { primaryClass }),
      ...(secondaryClass !== undefined && { secondaryClass }),
      ...(primaryRole && { primaryRole }),
      ...(secondaryRole !== undefined && { secondaryRole }),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      primaryClass: users.primaryClass,
      secondaryClass: users.secondaryClass,
      primaryRole: users.primaryRole,
      secondaryRole: users.secondaryRole,
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
