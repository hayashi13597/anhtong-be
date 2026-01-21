import { eq } from "drizzle-orm";
import { users } from "./db/schema";
import { hashPassword } from "./lib/auth";
import type { Database } from "./lib/db";

export async function seedAdminUsers(db: Database) {
  const adminAccounts = [
    { username: "adminvn", region: "vn" as const },
    { username: "adminna", region: "na" as const },
  ];

  const hashedPassword = await hashPassword("admin123@");

  for (const admin of adminAccounts) {
    // Check if admin already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.username, admin.username),
    });

    if (!existing) {
      await db.insert(users).values({
        username: admin.username,
        password: hashedPassword,
        isAdmin: true,
        region: admin.region,
      });
      console.log(`Created admin user: ${admin.username}`);
    } else {
      console.log(`Admin user already exists: ${admin.username}`);
    }
  }
}
