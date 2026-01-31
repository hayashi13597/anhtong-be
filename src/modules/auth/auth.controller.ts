import { Hono } from "hono";
import type { ClassType, TimeSlot } from "../../db/schema";
import { authMiddleware } from "../../lib/auth";
import { createDb } from "../../lib/db";
import type { AppEnv, Region, Role } from "../../types";
import { EventsRepository } from "../events/events.repository";
import { TeamsRepository } from "../teams/teams.repository";
import { UsersRepository } from "../users/users.repository";
import { AuthService } from "./auth.service";
import { SignupsRepository } from "./signups.repository";

const authController = new Hono<AppEnv>();

// Admin login endpoint (only admins need to login)
authController.post("/login", async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const eventsRepository = new EventsRepository(db);
  const signupsRepository = new SignupsRepository(db);
  const teamsRepository = new TeamsRepository(db);
  const authService = new AuthService(
    usersRepository,
    eventsRepository,
    signupsRepository,
    teamsRepository,
  );

  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  try {
    const result = await authService.login({ username, password });
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    if (message.includes("bắt buộc")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 401);
  }
});

// Event signup - regular users fill form to participate in current week's event
authController.post("/signup", async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const eventsRepository = new EventsRepository(db);
  const signupsRepository = new SignupsRepository(db);
  const teamsRepository = new TeamsRepository(db);
  const authService = new AuthService(
    usersRepository,
    eventsRepository,
    signupsRepository,
    teamsRepository,
  );

  const body = await c.req.json<{
    username: string;
    primaryClass: [ClassType, ClassType];
    secondaryClass?: [ClassType, ClassType];
    primaryRole: Role;
    secondaryRole?: Role;
    region: Region;
    timeSlots: TimeSlot[];
    notes?: string;
  }>();

  try {
    const result = await authService.signup(body);
    return c.json(result, result.updated ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    if (message.includes("khu vực khác")) {
      return c.json({ error: message }, 409);
    }
    if (message.includes("không có sự kiện")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

// Event signup via Discord
authController.post("/discord/signup", async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const eventsRepository = new EventsRepository(db);
  const signupsRepository = new SignupsRepository(db);
  const teamsRepository = new TeamsRepository(db);
  const authService = new AuthService(
    usersRepository,
    eventsRepository,
    signupsRepository,
    teamsRepository,
  );

  const body = await c.req.json<{
    discordId: string;
    username: string;
    primaryClass: [ClassType, ClassType];
    secondaryClass?: [ClassType, ClassType];
    primaryRole: Role;
    secondaryRole?: Role;
    region: Region;
    timeSlots: TimeSlot[];
    notes?: string;
  }>();

  try {
    const result = await authService.discordSignup(body);
    return c.json(result, result.updated ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    if (message.includes("khu vực khác") || message.includes("Discord khác")) {
      return c.json({ error: message }, 409);
    }
    if (message.includes("không có sự kiện")) {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

// Get current user profile (admin only)
authController.get("/me", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const usersRepository = new UsersRepository(db);
  const eventsRepository = new EventsRepository(db);
  const signupsRepository = new SignupsRepository(db);
  const teamsRepository = new TeamsRepository(db);
  const authService = new AuthService(
    usersRepository,
    eventsRepository,
    signupsRepository,
    teamsRepository,
  );
  const currentUser = c.get("user");

  try {
    const user = await authService.getCurrentUser(currentUser.id);
    return c.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "User not found";
    return c.json({ error: message }, 404);
  }
});

export default authController;
