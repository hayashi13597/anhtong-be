import { and, eq, inArray } from "drizzle-orm";
import type { EventSignup, NewEventSignup, TimeSlot } from "../../db/schema";
import { eventSignups, events } from "../../db/schema";
import type { Database } from "../../lib/db";
import type { Region } from "../../types";

export class SignupsRepository {
  constructor(private db: Database) {}

  async findByEventAndUser(
    eventId: number,
    userId: number,
  ): Promise<EventSignup | undefined> {
    return this.db.query.eventSignups.findFirst({
      where: and(
        eq(eventSignups.eventId, eventId),
        eq(eventSignups.userId, userId),
      ),
    });
  }

  async create(data: NewEventSignup): Promise<void> {
    await this.db.insert(eventSignups).values(data);
  }

  async update(
    eventId: number,
    userId: number,
    data: { timeSlots?: TimeSlot[]; notes?: string | null },
  ): Promise<void> {
    await this.db
      .update(eventSignups)
      .set(data)
      .where(
        and(eq(eventSignups.eventId, eventId), eq(eventSignups.userId, userId)),
      );
  }

  async deleteByUserAndRegion(userId: number, region: Region): Promise<void> {
    const eventIds = this.db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.region, region));

    await this.db
      .delete(eventSignups)
      .where(
        and(
          eq(eventSignups.userId, userId),
          inArray(eventSignups.eventId, eventIds),
        ),
      );
  }
}
