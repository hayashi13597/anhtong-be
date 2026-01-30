import { and, desc, eq } from "drizzle-orm";
import type { Event, NewEvent } from "../../db/schema";
import { events } from "../../db/schema";
import type { Database } from "../../lib/db";
import type { Region } from "../../types";

export class EventsRepository {
  constructor(private db: Database) {}

  async findAll(region: Region) {
    return this.db.query.events.findMany({
      where: eq(events.region, region),
      with: {
        teams: true,
        signups: true,
      },
      orderBy: [desc(events.weekStartDate)],
    });
  }

  async findById(id: number) {
    return this.db.query.events.findFirst({
      where: eq(events.id, id),
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
  }

  async findLatestByRegion(region: Region) {
    return this.db.query.events.findFirst({
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
  }

  async findByRegionAndWeek(
    region: Region,
    weekStartDate: Date,
  ): Promise<Event | undefined> {
    return this.db.query.events.findFirst({
      where: and(
        eq(events.region, region),
        eq(events.weekStartDate, weekStartDate),
      ),
    });
  }

  async create(data: NewEvent): Promise<Event> {
    const [event] = await this.db.insert(events).values(data).returning();
    return event;
  }
}
