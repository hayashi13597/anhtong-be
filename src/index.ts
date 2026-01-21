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

// Scheduled handler for automatic weekly event creation
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // This runs on schedule (configured in wrangler.jsonc)
    const db = createDb(env.DB);

    // Import the event creation logic
    const { events, teams } = await import("./db/schema");
    const { eq, and } = await import("drizzle-orm");

    // Use UTC to avoid timezone issues
    const now = new Date();
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0),
    );

    for (const region of ["vn", "na"] as const) {
      // Check if event exists
      const existing = await db.query.events.findFirst({
        where: and(eq(events.region, region), eq(events.weekStartDate, monday)),
      });

      if (!existing) {
        // Create event
        const [newEvent] = await db
          .insert(events)
          .values({ region, weekStartDate: monday })
          .returning();

        // Create default teams
        const defaultTeams = [
          { name: "Team Alpha", description: "First team" },
          { name: "Team Beta", description: "Second team" },
          { name: "Team Gamma", description: "Third team" },
        ];

        for (const team of defaultTeams) {
          await db.insert(teams).values({
            eventId: newEvent.id,
            name: team.name,
            description: team.description,
          });
        }

        console.log(`Created weekly event for region: ${region}`);
      }
    }
  },
};
