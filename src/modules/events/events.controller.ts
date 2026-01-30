import { Hono } from "hono";
import { adminMiddleware, authMiddleware } from "../../lib/auth";
import { createDb } from "../../lib/db";
import type { AppEnv, Region } from "../../types";
import { EventsRepository } from "./events.repository";
import { EventsService } from "./events.service";

const eventsController = new Hono<AppEnv>();

// Manual event creation (creates event immediately for admin's region)
eventsController.post(
  "/create",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const eventsRepository = new EventsRepository(db);
    const eventsService = new EventsService(eventsRepository, db);
    const user = c.get("user");

    const newEvent = await eventsService.createEvent(user.region as Region);

    return c.json(
      { message: "Event created successfully", event: newEvent },
      201,
    );
  },
);

// Trigger to create weekly events (should be called by a cron job on Mondays)
eventsController.post(
  "/create-weekly",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const eventsRepository = new EventsRepository(db);
    const eventsService = new EventsService(eventsRepository, db);
    const user = c.get("user");

    const result = await eventsService.createWeeklyEvent(user.region as Region);

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
eventsController.post("/auto-create-weekly", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const eventsRepository = new EventsRepository(db);
    const eventsService = new EventsService(eventsRepository, db);

    const vnResult = await eventsService.createWeeklyEvent("vn");
    const naResult = await eventsService.createWeeklyEvent("na");

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
eventsController.get("/", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const eventsRepository = new EventsRepository(db);
  const eventsService = new EventsService(eventsRepository, db);
  const user = c.get("user");
  const regionParam = c.req.query("region") as Region | undefined;

  const region = regionParam || (user.region as Region);
  const eventsList = await eventsService.getAllEvents(region);

  return c.json(eventsList);
});

// Get latest event for the region (public - for signup form)
eventsController.get("/current/:region", async (c) => {
  const db = createDb(c.env.DB);
  const eventsRepository = new EventsRepository(db);
  const eventsService = new EventsService(eventsRepository, db);
  const region = c.req.param("region") as Region;

  if (!region || !["vn", "na"].includes(region)) {
    return c.json({ error: "Region must be 'vn' or 'na'" }, 400);
  }

  const event = await eventsService.getLatestEvent(region);

  if (!event) {
    return c.json({ error: "No event found for this region" }, 404);
  }

  return c.json(event);
});

// Get latest event for admin's region
eventsController.get("/current", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const eventsRepository = new EventsRepository(db);
  const eventsService = new EventsService(eventsRepository, db);
  const user = c.get("user");

  const event = await eventsService.getLatestEvent(user.region as Region);

  if (!event) {
    return c.json({ error: "No event found for this region" }, 404);
  }

  return c.json(event);
});

// Get single event by ID
eventsController.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const eventsRepository = new EventsRepository(db);
  const eventsService = new EventsService(eventsRepository, db);
  const eventId = parseInt(c.req.param("id"));

  const event = await eventsService.getEventById(eventId);

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json(event);
});

export default eventsController;
