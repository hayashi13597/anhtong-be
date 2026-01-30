import { eq } from "drizzle-orm";
import type { ClassType, NewUser, User } from "../../db/schema";
import { users } from "../../db/schema";
import type { Database } from "../../lib/db";
import type { Region } from "../../types";

export class UsersRepository {
  constructor(private db: Database) {}

  async findAll(region: Region): Promise<Partial<User>[]> {
    return this.db.query.users.findMany({
      where: eq(users.region, region),
      columns: {
        id: true,
        username: true,
        primaryClass: true,
        secondaryClass: true,
        primaryRole: true,
        secondaryRole: true,
        region: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  async findById(id: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByIdWithColumns(id: number): Promise<Partial<User> | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        username: true,
        primaryClass: true,
        secondaryClass: true,
        primaryRole: true,
        secondaryRole: true,
        region: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  async findByDiscordId(discordId: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.discordId, discordId),
    });
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async update(
    id: number,
    data: {
      primaryClass?: [ClassType, ClassType];
      secondaryClass?: [ClassType, ClassType] | null;
      primaryRole?: "dps" | "healer" | "tank";
      secondaryRole?: "dps" | "healer" | "tank" | null;
      discordId?: string;
      username?: string;
    },
  ): Promise<Partial<User>> {
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        primaryClass: users.primaryClass,
        secondaryClass: users.secondaryClass,
        primaryRole: users.primaryRole,
        secondaryRole: users.secondaryRole,
        region: users.region,
        isAdmin: users.isAdmin,
      });
    return updatedUser;
  }

  async updateFull(id: number, data: Partial<NewUser>): Promise<User> {
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
