import {
  NewScheduledNotification,
  UpdateScheduledNotification,
} from "../../db/schema";
import { Region } from "../../types";
import { ScheduleRepository } from "./schedule.repository";

export class ScheduleService {
  constructor(private scheduleRepository: ScheduleRepository) {}

  async getAllSchedules() {
    return this.scheduleRepository.findAll();
  }

  async getSchedulesByRegion(region: Region) {
    return this.scheduleRepository.findByRegion(region);
  }

  async createSchedule(data: NewScheduledNotification) {
    return this.scheduleRepository.create(data);
  }

  async updateSchedule(id: number, data: UpdateScheduledNotification) {
    return this.scheduleRepository.update(id, data);
  }

  async deleteSchedule(id: number) {
    return this.scheduleRepository.delete(id);
  }
}
