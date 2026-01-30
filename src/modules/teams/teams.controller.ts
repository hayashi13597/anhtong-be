import { Hono } from "hono";
import { adminMiddleware, authMiddleware } from "../../lib/auth";
import { createDb } from "../../lib/db";
import type { AppEnv, Day, Region } from "../../types";
import { TeamsRepository } from "./teams.repository";
import { TeamsService } from "./teams.service";

const teamsController = new Hono<AppEnv>();

// Get all teams for an event
teamsController.get("/event/:eventId", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const teamsRepository = new TeamsRepository(db);
  const teamsService = new TeamsService(teamsRepository, db);
  const eventId = parseInt(c.req.param("eventId"));

  const teamsList = await teamsService.getTeamsByEventId(eventId);
  return c.json(teamsList);
});

// Get single team
teamsController.get("/:id", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const teamsRepository = new TeamsRepository(db);
  const teamsService = new TeamsService(teamsRepository, db);
  const teamId = parseInt(c.req.param("id"));

  const team = await teamsService.getTeamById(teamId);

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  return c.json(team);
});

// Create a new team (admin only)
teamsController.post("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const teamsRepository = new TeamsRepository(db);
  const teamsService = new TeamsService(teamsRepository, db);
  const user = c.get("user");

  const { eventId, name, description, day } = await c.req.json<{
    eventId: number;
    name: string;
    description?: string;
    day?: Day;
  }>();

  try {
    const newTeam = await teamsService.createTeam(user.region as Region, {
      eventId,
      name,
      description,
      day,
    });
    return c.json(newTeam, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    if (message.includes("another region")) {
      return c.json({ error: message }, 403);
    }
    return c.json({ error: message }, 400);
  }
});

// Update a team (admin only)
teamsController.put("/:id", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const teamsRepository = new TeamsRepository(db);
  const teamsService = new TeamsService(teamsRepository, db);
  const user = c.get("user");
  const teamId = parseInt(c.req.param("id"));

  const { name, description, day } = await c.req.json<{
    name?: string;
    description?: string;
    day?: Day;
  }>();

  try {
    const updatedTeam = await teamsService.updateTeam(
      user.region as Region,
      teamId,
      {
        name,
        description,
        day,
      },
    );
    return c.json(updatedTeam);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message.includes("not found")) {
      return c.json({ error: message }, 404);
    }
    if (message.includes("another region")) {
      return c.json({ error: message }, 403);
    }
    return c.json({ error: message }, 400);
  }
});

// Delete a team (admin only)
teamsController.delete(
  "/:id",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const teamsRepository = new TeamsRepository(db);
    const teamsService = new TeamsService(teamsRepository, db);
    const user = c.get("user");
    const teamId = parseInt(c.req.param("id"));

    try {
      await teamsService.deleteTeam(user.region as Region, teamId);
      return c.json({ message: "Team deleted" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      if (message.includes("not found")) {
        return c.json({ error: message }, 404);
      }
      if (message.includes("another region")) {
        return c.json({ error: message }, 403);
      }
      return c.json({ error: message }, 400);
    }
  },
);

// Assign user to team (admin only)
teamsController.post(
  "/:id/members",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const teamsRepository = new TeamsRepository(db);
    const teamsService = new TeamsService(teamsRepository, db);
    const user = c.get("user");
    const teamId = parseInt(c.req.param("id"));
    const { userId } = await c.req.json<{ userId: number }>();

    try {
      await teamsService.addMemberToTeam(user.region as Region, teamId, userId);
      return c.json({ message: "User assigned to team" }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assign failed";
      if (message.includes("not found")) {
        return c.json({ error: message }, 404);
      }
      if (message.includes("another region")) {
        return c.json({ error: message }, 403);
      }
      if (message.includes("already a member")) {
        return c.json({ error: message }, 409);
      }
      return c.json({ error: message }, 400);
    }
  },
);

// Remove user from team (admin only)
teamsController.delete(
  "/:id/members/:userId",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const teamsRepository = new TeamsRepository(db);
    const teamsService = new TeamsService(teamsRepository, db);
    const user = c.get("user");
    const teamId = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.param("userId"));

    try {
      await teamsService.removeMemberFromTeam(
        user.region as Region,
        teamId,
        userId,
      );
      return c.json({ message: "User removed from team" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remove failed";
      if (message.includes("not found")) {
        return c.json({ error: message }, 404);
      }
      if (message.includes("another region")) {
        return c.json({ error: message }, 403);
      }
      return c.json({ error: message }, 400);
    }
  },
);

export default teamsController;
