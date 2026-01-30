import { Hono } from "hono";
import { adminMiddleware, authMiddleware } from "../../lib/auth";
import { createDb } from "../../lib/db";
import { AppEnv } from "../../types";
import { ScheduleRepository } from "./schedule.repository";
import { ScheduleService } from "./schedule.service";

const scheduleController = new Hono<AppEnv>();

scheduleController.get("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const scheduleRepository = new ScheduleRepository(db);
  const scheduleService = new ScheduleService(scheduleRepository);

  const scheduleList = await scheduleService.getAllSchedules();
  return c.json(scheduleList);
});

scheduleController.get("/region/:region", async (c) => {
  const db = createDb(c.env.DB);
  const scheduleRepository = new ScheduleRepository(db);
  const scheduleService = new ScheduleService(scheduleRepository);
  const region = c.req.param("region") as "vn" | "na";

  const scheduleList = await scheduleService.getSchedulesByRegion(region);
  return c.json(scheduleList);
});

scheduleController.post("/", authMiddleware(), adminMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const scheduleRepository = new ScheduleRepository(db);
  const scheduleService = new ScheduleService(scheduleRepository);
  const data = await c.req.json();

  const newSchedule = await scheduleService.createSchedule(data);
  return c.json(newSchedule, 201);
});

scheduleController.put(
  "/:id",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const scheduleRepository = new ScheduleRepository(db);
    const scheduleService = new ScheduleService(scheduleRepository);
    const id = parseInt(c.req.param("id"));
    const data = await c.req.json();
    const updatedSchedule = await scheduleService.updateSchedule(id, data);
    return c.json(updatedSchedule);
  },
);

scheduleController.delete(
  "/:id",
  authMiddleware(),
  adminMiddleware(),
  async (c) => {
    const db = createDb(c.env.DB);
    const scheduleRepository = new ScheduleRepository(db);
    const scheduleService = new ScheduleService(scheduleRepository);
    const id = parseInt(c.req.param("id"));
    await scheduleService.deleteSchedule(id);
    return c.json({ message: "Schedule deleted successfully" });
  },
);

export default scheduleController;
