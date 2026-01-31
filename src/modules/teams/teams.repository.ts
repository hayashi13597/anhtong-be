import { and, eq } from "drizzle-orm";
import type { NewTeam, NewTeamMember, Team } from "../../db/schema";
import { teamMembers, teams } from "../../db/schema";
import type { Database } from "../../lib/db";

export class TeamsRepository {
  constructor(private db: Database) {}

  async findByEventId(eventId: number) {
    return this.db.query.teams.findMany({
      where: eq(teams.eventId, eventId),
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    return this.db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        event: true,
        members: {
          with: {
            user: true,
          },
        },
      },
    });
  }

  async findByIdWithEvent(id: number) {
    return this.db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        event: true,
      },
    });
  }

  async create(data: NewTeam): Promise<Team> {
    const [team] = await this.db.insert(teams).values(data).returning();
    return team;
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      day?: "saturday" | "sunday";
    },
  ): Promise<Team> {
    const [updatedTeam] = await this.db
      .update(teams)
      .set(data)
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(teams).where(eq(teams.id, id));
  }

  async findMember(teamId: number, userId: number) {
    return this.db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
      ),
    });
  }

  async addMember(data: NewTeamMember): Promise<void> {
    await this.db.insert(teamMembers).values(data);
  }

  async removeMember(teamId: number, userId: number): Promise<void> {
    await this.db
      .delete(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );
  }

  async removeAllMembersForUser(userId: number): Promise<void> {
    await this.db.delete(teamMembers).where(eq(teamMembers.userId, userId));
  }
}
