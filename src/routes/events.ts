import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { events, teams } from "../db/schema";
import type { Env } from "../index";
import { adminMiddleware, authMiddleware } from "../lib/auth";
import { createDb } from "../lib/db";
import { getCurrentWeekWednesday } from "../lib/utils";

type Variables = {
  user: {
    id: number;
    username: string;
    region: string;
    isAdmin: boolean;
  };
};

const eventsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Create default teams for a new event
async function createDefaultTeams(
  db: ReturnType<typeof createDb>,
  eventId: number,
) {
  const defaultTeams = [
    // Saturday teams
    {
      name: "Team Top",
      description: "Top lane team",
      day: "saturday" as const,
    },
    {
      name: "Team Mid",
      description: "Mid lane team",
      day: "saturday" as const,
    },
    {
      name: "Team Bot",
      description: "Bot lane team",
      day: "saturday" as const,
    },
    // Sunday teams
    { name: "Team Top", description: "Top lane team", day: "sunday" as const },
    { name: "Team Mid", description: "Mid lane team", day: "sunday" as const },
    { name: "Team Bot", description: "Bot lane team", day: "sunday" as const },
  ];

  for (const team of defaultTeams) {
    await db.insert(teams).values({
      eventId,
      name: team.name,
      description: team.description,
      day: team.day,
    });
  }
}

// Create weekly event for a region (called automatically or manually by admin)
async function createWeeklyEvent(
  db: ReturnType<typeof createDb>,
  region: "vn" | "na",
) {
  const wednesday = getCurrentWeekWednesday();

  // Check if event already exists for this week and region
  const existingEvent = await db.query.events.findFirst({
    where: and(eq(events.region, region), eq(events.weekStartDate, wednesday)),
  });

  if (existingEvent) {
    return { event: existingEvent, created: false };
  }

  // Create new event
  const [newEvent] = await db
    .insert(events)
    .values({
      region,
      weekStartDate: wednesday,
    })
    .returning();

  // Create default teams
  await createDefaultTeams(db, newEvent.id);

  return { event: newEvent, created: true };
}

// Manual event creation (creates event immediately for admin's region)
eventsRouter.post("/create", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");

  // Admin can only create events for their region
  const region = user.region as "vn" | "na";

  // Create new event with current date
  const [newEvent] = await db
    .insert(events)
    .values({
      region,
      weekStartDate: new Date(), // Use current date instead of Wednesday
    })
    .returning();

  // Create default teams
  await createDefaultTeams(db, newEvent.id);

  return c.json(
    { message: "Event created successfully", event: newEvent },
    201,
  );
});

// Trigger to create weekly events (should be called by a cron job on Mondays)
eventsRouter.post(
  "/create-weekly",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const user = c.get("user");

    // Admin can only create events for their region
    const region = user.region as "vn" | "na";
    const result = await createWeeklyEvent(db, region);

    if (!result.created) {
      return c.json({
        message: "Event already exists for this week",
        event: result.event,
      });
    }

    return c.json(
      { message: "Weekly event created", event: result.event },
      201,
    );
  },
);

// Auto-create events for both regions (for cron trigger)
eventsRouter.post("/auto-create-weekly", async (c) => {
  try {
    // This endpoint can be called by Cloudflare Cron Trigger
    // In production, you'd add authentication for cron calls
    const db = createDb(c.env.DB);

    const vnResult = await createWeeklyEvent(db, "vn");
    const naResult = await createWeeklyEvent(db, "na");

    return c.json({
      vn: {
        created: vnResult.created,
        event: vnResult.event,
      },
      na: {
        created: naResult.created,
        event: naResult.event,
      },
    });
  } catch (error) {
    console.error("Error creating weekly events:", error);
    return c.json(
      {
        error: "Failed to create weekly events",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// Get all events (filtered by region for non-admin, or query param)
eventsRouter.get("/", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const regionParam = c.req.query("region") as "vn" | "na" | undefined;

  // Use query param if provided, otherwise use user's region
  const region = regionParam || user.region;

  const eventsList = await db.query.events.findMany({
    where: eq(events.region, region as "vn" | "na"),
    with: {
      teams: true,
      signups: true,
    },
    orderBy: [desc(events.weekStartDate)],
  });

  return c.json(eventsList);
});

// Get latest event for the region (public - for signup form)
eventsRouter.get("/current/:region", async (c) => {
  const db = createDb(c.env.DB);
  const region = c.req.param("region") as "vn" | "na";

  if (!region || !["vn", "na"].includes(region)) {
    return c.json({ error: "Region must be 'vn' or 'na'" }, 400);
  }

  // Get the most recent event for this region
  const event = await db.query.events.findFirst({
    where: eq(events.region, region),
    orderBy: [desc(events.createdAt)],
    with: {
      signups: {
        with: {
          user: true,
        },
      },
      teams: {
        with: {
          members: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return c.json({ error: "No event found for this region" }, 404);
  }

  return c.json(event);
});

// Get latest event for admin's region
eventsRouter.get("/current", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");

  // Get the most recent event for this region
  const event = await db.query.events.findFirst({
    where: eq(events.region, user.region as "vn" | "na"),
    orderBy: [desc(events.createdAt)],
    with: {
      signups: {
        with: {
          user: true,
        },
      },
      teams: {
        with: {
          members: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return c.json({ error: "No event found for this region" }, 404);
  }

  return c.json(event);
});

// Get single event by ID
eventsRouter.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const eventId = parseInt(c.req.param("id"));

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      signups: {
        with: {
          user: true,
        },
      },
      teams: {
        with: {
          members: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json(event);
});

export default eventsRouter;
