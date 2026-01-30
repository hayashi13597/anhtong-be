import { Hono } from "hono";
import type { ClassType } from "../../db/schema";
import { adminMiddleware, authMiddleware } from "../../lib/auth";
import { createDb } from "../../lib/db";
import type { AppEnv, Role } from "../../types";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

const usersController = new Hono<AppEnv>();

// Get all users in the same region (admin only)
usersController.get("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  const user = c.get("user");

  const usersList = await usersService.getAllUsers(user.region as "vn" | "na");
  return c.json(usersList);
});

// Get single user
usersController.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  const userId = parseInt(c.req.param("id"));

  const user = await usersService.getUserById(userId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

// Update user profile (own profile or admin can update others in same region)
usersController.put("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  const currentUser = c.get("user");
  const userId = parseInt(c.req.param("id"));

  const { primaryClass, secondaryClass, primaryRole, secondaryRole } =
    await c.req.json<{
      primaryClass?: [ClassType, ClassType];
      secondaryClass?: [ClassType, ClassType];
      primaryRole?: Role;
      secondaryRole?: Role;
    }>();

  try {
    const updatedUser = await usersService.updateUser(currentUser, userId, {
      primaryClass,
      secondaryClass,
      primaryRole,
      secondaryRole,
    });
    return c.json(updatedUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message.includes("not found") || message.includes("different region")) {
      return c.json({ error: message }, 404);
    }
    if (message.includes("Cannot update")) {
      return c.json({ error: message }, 403);
    }
    return c.json({ error: message }, 400);
  }
});

// Delete user (admin only)
usersController.delete(
  "/:id",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const usersRepository = new UsersRepository(db);
    const usersService = new UsersService(usersRepository);
    const currentUser = c.get("user");
    const userId = parseInt(c.req.param("id"));

    try {
      await usersService.deleteUser(currentUser, userId);
      return c.json({ message: "User deleted successfully" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return c.json({ error: message }, 404);
    }
  },
);

export default usersController;
