import { teams } from "../../db/schema";
import type { Database } from "../../lib/db";
import { getCurrentWeekWednesday } from "../../lib/utils";
import type { Region } from "../../types";
import { EventsRepository } from "./events.repository";

const DEFAULT_TEAMS = [
  // Saturday teams
  { name: "Team Top", description: "Top lane team", day: "saturday" as const },
  { name: "Team Mid", description: "Mid lane team", day: "saturday" as const },
  { name: "Team Bot", description: "Bot lane team", day: "saturday" as const },
  // Sunday teams
  { name: "Team Top", description: "Top lane team", day: "sunday" as const },
  { name: "Team Mid", description: "Mid lane team", day: "sunday" as const },
  { name: "Team Bot", description: "Bot lane team", day: "sunday" as const },
];

export class EventsService {
  constructor(
    private eventsRepository: EventsRepository,
    private db: Database,
  ) {}

  async getAllEvents(region: Region) {
    return this.eventsRepository.findAll(region);
  }

  async getEventById(id: number) {
    return this.eventsRepository.findById(id);
  }

  async getLatestEvent(region: Region) {
    return this.eventsRepository.findLatestByRegion(region);
  }

  async createEvent(region: Region) {
    const newEvent = await this.eventsRepository.create({
      region,
      weekStartDate: new Date(),
    });

    await this.createDefaultTeams(newEvent.id);

    return newEvent;
  }

  async createWeeklyEvent(region: Region) {
    const wednesday = getCurrentWeekWednesday();

    // Check if event already exists for this week and region
    const existingEvent = await this.eventsRepository.findByRegionAndWeek(
      region,
      wednesday,
    );

    if (existingEvent) {
      return { event: existingEvent, created: false };
    }

    const newEvent = await this.eventsRepository.create({
      region,
      weekStartDate: wednesday,
    });

    await this.createDefaultTeams(newEvent.id);

    return { event: newEvent, created: true };
  }

  private async createDefaultTeams(eventId: number) {
    for (const team of DEFAULT_TEAMS) {
      await this.db.insert(teams).values({
        eventId,
        name: team.name,
        description: team.description,
        day: team.day,
      });
    }
  }
}
