# AnhTong Guild Backend

A simple guild event management API built with Hono and Cloudflare Workers (D1 database).

## Features

- **Weekly Events**: Auto-created every Monday for VN and NA regions (3 default teams each)
- **Team Management**: Admin can create, update, delete teams
- **User Assignment**: Admin assigns users to teams
- **Event Signup**: Users fill a simple form to sign up for weekly events (no registration needed)
- **Pre-seeded Admins**: `adminvn` and `adminna` with password `admin123@`

## Workflow

1. **Events are auto-created** every Monday for VN and NA regions
2. **Users sign up** by filling a simple form (username, classes, role, region) - no password needed
3. **Returning users** are recognized by username and linked to the new event
4. **Admins login** to manage teams and assign users

## Setup

```bash
# Install dependencies
bun install

# Apply database migrations (local)
wrangler d1 execute anhtong-guild-db --local --file=./drizzle/migrations/0000_initial_schema.sql

# Start dev server
bun run dev

# Seed admin users (call once)
curl -X POST http://127.0.0.1:8787/seed
```

## API Endpoints

### Authentication & Signup

| Method | Endpoint       | Description                        | Auth |
| ------ | -------------- | ---------------------------------- | ---- |
| POST   | `/auth/login`  | Admin login with username/password | No   |
| POST   | `/auth/signup` | Sign up for current week's event   | No   |
| GET    | `/auth/me`     | Get current admin profile          | Yes  |

**Admin Login:**

```json
{ "username": "adminvn", "password": "admin123@" }
```

**Event Signup (for regular users):**

```json
{
  "username": "player1",
  "classes": "Warrior, Mage",
  "role": "dps",
  "region": "vn"
}
```

- `role`: "dps" | "healer" | "tank"
- `region`: "vn" | "na"
- If username exists, user info is updated and linked to current event
- If username is new, a new user is created and linked to current event

### Events

| Method | Endpoint                     | Description                        | Auth  |
| ------ | ---------------------------- | ---------------------------------- | ----- |
| GET    | `/events/current/:region`    | Get current week's event (public)  | No    |
| GET    | `/events`                    | List events for admin's region     | Admin |
| GET    | `/events/current`            | Get current week's event for admin | Admin |
| GET    | `/events/:id`                | Get event by ID                    | Admin |
| POST   | `/events/create-weekly`      | Manually create weekly event       | Admin |
| POST   | `/events/auto-create-weekly` | Auto-create for both regions       | Cron  |

### Teams

| Method | Endpoint                     | Description            | Auth  |
| ------ | ---------------------------- | ---------------------- | ----- |
| GET    | `/teams/event/:eventId`      | Get teams for an event | Admin |
| GET    | `/teams/:id`                 | Get team details       | Admin |
| POST   | `/teams`                     | Create new team        | Admin |
| PUT    | `/teams/:id`                 | Update team            | Admin |
| DELETE | `/teams/:id`                 | Delete team            | Admin |
| POST   | `/teams/:id/members`         | Assign user to team    | Admin |
| DELETE | `/teams/:id/members/:userId` | Remove user from team  | Admin |

**Create Team:**

```json
{ "eventId": 1, "name": "Team Delta", "description": "Fourth team" }
```

**Assign User:**

```json
{ "userId": 3 }
```

### Users

| Method | Endpoint     | Description               | Auth  |
| ------ | ------------ | ------------------------- | ----- |
| GET    | `/users`     | List users in same region | Admin |
| GET    | `/users/:id` | Get user details          | Admin |
| PUT    | `/users/:id` | Update user profile       | Admin |
| DELETE | `/users/:id` | Delete user               | Admin |

## Authorization

Include token in header (for admin endpoints):

```
Authorization: Bearer <token>
```

## Cron Trigger

Events are auto-created every Monday at 00:00 UTC via Cloudflare Cron Trigger.

To test locally:

```bash
curl http://127.0.0.1:8787/cdn-cgi/handler/scheduled
```

## Deploy

```bash
# Apply migrations to remote D1
wrangler d1 execute anhtong-guild-db --remote --file=./drizzle/migrations/0000_initial_schema.sql

# Deploy worker
bun run deploy

# Seed admin users on production
curl -X POST https://your-worker.workers.dev/seed
```
