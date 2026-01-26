import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createDb } from "./lib/db";
import authRoutes from "./routes/auth";
import eventsRoutes from "./routes/events";
import teamsRoutes from "./routes/teams";
import usersRoutes from "./routes/users";
import { seedAdminUsers } from "./seed";

export type Env = {
  DB: D1Database;
};

type Variables = {
  user: {
    id: number;
    username: string;
    region: string;
    isAdmin: boolean;
  };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({ message: "AnhTong Guild API", status: "ok" });
});

// Seed admin users endpoint (call once to initialize)
app.post("/seed", async (c) => {
  const db = createDb(c.env.DB);
  await seedAdminUsers(db);
  return c.json({ message: "Admin users seeded successfully" });
});

// Routes
app.route("/auth", authRoutes);
app.route("/events", eventsRoutes);
app.route("/teams", teamsRoutes);
app.route("/users", usersRoutes);

export default app;
