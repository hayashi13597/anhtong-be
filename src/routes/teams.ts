import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { events, teamMembers, teams, users } from "../db/schema";
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

const teamsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all teams for an event
teamsRouter.get("/event/:eventId", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const eventId = parseInt(c.req.param("eventId"));

  const teamsList = await db.query.teams.findMany({
    where: eq(teams.eventId, eventId),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  return c.json(teamsList);
});

// Get single team
teamsRouter.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const teamId = parseInt(c.req.param("id"));

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      event: true,
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  return c.json(team);
});

// Create a new team (admin only)
teamsRouter.post("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const { eventId, name, description, day } = await c.req.json<{
    eventId: number;
    name: string;
    description?: string;
    day?: "saturday" | "sunday";
  }>();

  if (!eventId || !name) {
    return c.json({ error: "Event ID and team name are required" }, 400);
  }

  // Verify event exists and belongs to admin's region
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (event.region !== user.region) {
    return c.json({ error: "Cannot create team for another region" }, 403);
  }

  const [newTeam] = await db
    .insert(teams)
    .values({
      eventId,
      name,
      description: description || null,
      day: day || "saturday",
    })
    .returning();

  return c.json(newTeam, 201);
});

// Update a team (admin only)
teamsRouter.put("/:id", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const teamId = parseInt(c.req.param("id"));
  const { name, description, day } = await c.req.json<{
    name?: string;
    description?: string;
    day?: "saturday" | "sunday";
  }>();

  // Get team with its event
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      event: true,
    },
  });

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  if (team.event.region !== user.region) {
    return c.json({ error: "Cannot update team from another region" }, 403);
  }

  const [updatedTeam] = await db
    .update(teams)
    .set({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(day && { day }),
    })
    .where(eq(teams.id, teamId))
    .returning();

  return c.json(updatedTeam);
});

// Delete a team (admin only)
teamsRouter.delete("/:id", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const teamId = parseInt(c.req.param("id"));

  // Get team with its event
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      event: true,
    },
  });

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  if (team.event.region !== user.region) {
    return c.json({ error: "Cannot delete team from another region" }, 403);
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  return c.json({ message: "Team deleted" });
});

// Assign user to team (admin only)
teamsRouter.post(
  "/:id/members",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const user = c.get("user");
    const teamId = parseInt(c.req.param("id"));
    const { userId } = await c.req.json<{ userId: number }>();

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    // Get team with its event
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        event: true,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (team.event.region !== user.region) {
      return c.json(
        { error: "Cannot assign members to team from another region" },
        403,
      );
    }

    // Verify user exists and is from the same region
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (targetUser.region !== user.region) {
      return c.json({ error: "User is from a different region" }, 400);
    }

    // Check if already a member
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
      ),
    });

    if (existingMember) {
      return c.json({ error: "User is already a member of this team" }, 409);
    }

    await db.insert(teamMembers).values({
      teamId,
      userId,
    });

    return c.json({ message: "User assigned to team" }, 201);
  },
);

// Remove user from team (admin only)
teamsRouter.delete(
  "/:id/members/:userId",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const user = c.get("user");
    const teamId = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.param("userId"));

    // Get team with its event
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      with: {
        event: true,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (team.event.region !== user.region) {
      return c.json(
        { error: "Cannot remove members from team in another region" },
        403,
      );
    }

    await db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );

    return c.json({ message: "User removed from team" });
  },
);

export default teamsRouter;
