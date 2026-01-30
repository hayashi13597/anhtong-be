import { eq } from "drizzle-orm";
import {
  NewScheduledNotification,
  ScheduledNotification,
  scheduledNotifications,
  UpdateScheduledNotification,
} from "../../db/schema";
import { Database } from "../../lib/db";
import { Region } from "../../types";

export class ScheduleRepository {
  constructor(private db: Database) {}

  // create new schedule
  async create(data: NewScheduledNotification): Promise<ScheduledNotification> {
    const [scheduledNotification] = await this.db
      .insert(scheduledNotifications)
      .values(data)
      .returning();

    return scheduledNotification;
  }

  // get all schedules
  async findAll(): Promise<ScheduledNotification[]> {
    return this.db.query.scheduledNotifications.findMany();
  }

  // get schedules by region
  async findByRegion(region: Region): Promise<ScheduledNotification[]> {
    return this.db.query.scheduledNotifications.findMany({
      where: eq(scheduledNotifications.region, region),
    });
  }

  // update schedule by id
  async update(
    id: number,
    data: UpdateScheduledNotification,
  ): Promise<ScheduledNotification> {
    const [updatedScheduledNotification] = await this.db
      .update(scheduledNotifications)
      .set(data)
      .where(eq(scheduledNotifications.id, id))
      .returning();
    return updatedScheduledNotification;
  }

  // delete schedule by id
  async delete(id: number): Promise<void> {
    await this.db
      .delete(scheduledNotifications)
      .where(eq(scheduledNotifications.id, id));
  }
}
