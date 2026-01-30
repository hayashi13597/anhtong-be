import { and, eq } from "drizzle-orm";
import type { EventSignup, NewEventSignup, TimeSlot } from "../../db/schema";
import { eventSignups } from "../../db/schema";
import type { Database } from "../../lib/db";

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
}
