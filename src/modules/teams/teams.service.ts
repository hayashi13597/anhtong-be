import { eq } from "drizzle-orm";
import { events, users } from "../../db/schema";
import type { Database } from "../../lib/db";
import type { Day, Region } from "../../types";
import { TeamsRepository } from "./teams.repository";

export class TeamsService {
  constructor(
    private teamsRepository: TeamsRepository,
    private db: Database,
  ) {}

  async getTeamsByEventId(eventId: number) {
    return this.teamsRepository.findByEventId(eventId);
  }

  async getTeamById(id: number) {
    return this.teamsRepository.findById(id);
  }

  async createTeam(
    userRegion: Region,
    data: {
      eventId: number;
      name: string;
      description?: string;
      day?: Day;
    },
  ) {
    if (!data.eventId || !data.name) {
      throw new Error("Event ID and team name are required");
    }

    // Verify event exists and belongs to admin's region
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, data.eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.region !== userRegion) {
      throw new Error("Cannot create team for another region");
    }

    return this.teamsRepository.create({
      eventId: data.eventId,
      name: data.name,
      description: data.description || null,
      day: data.day || "saturday",
    });
  }

  async updateTeam(
    userRegion: Region,
    teamId: number,
    data: { name?: string; description?: string; day?: Day },
  ) {
    const team = await this.teamsRepository.findByIdWithEvent(teamId);

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.event.region !== userRegion) {
      throw new Error("Cannot update team from another region");
    }

    return this.teamsRepository.update(teamId, {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.day && { day: data.day }),
    });
  }

  async deleteTeam(userRegion: Region, teamId: number) {
    const team = await this.teamsRepository.findByIdWithEvent(teamId);

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.event.region !== userRegion) {
      throw new Error("Cannot delete team from another region");
    }

    await this.teamsRepository.delete(teamId);
  }

  async addMemberToTeam(userRegion: Region, teamId: number, userId: number) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const team = await this.teamsRepository.findByIdWithEvent(teamId);

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.event.region !== userRegion) {
      throw new Error("Cannot assign members to team from another region");
    }

    // Verify user exists and is from the same region
    const targetUser = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.region !== userRegion) {
      throw new Error("User is from a different region");
    }

    // Check if already a member
    const existingMember = await this.teamsRepository.findMember(
      teamId,
      userId,
    );

    if (existingMember) {
      throw new Error("User is already a member of this team");
    }

    await this.teamsRepository.addMember({ teamId, userId });
  }

  async removeMemberFromTeam(
    userRegion: Region,
    teamId: number,
    userId: number,
  ) {
    const team = await this.teamsRepository.findByIdWithEvent(teamId);

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.event.region !== userRegion) {
      throw new Error("Cannot remove members from team in another region");
    }

    await this.teamsRepository.removeMember(teamId, userId);
  }
}
