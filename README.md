# AnhTong Guild Backend

A guild event management API built with [Hono](https://hono.dev/) and [Cloudflare Workers](https://workers.cloudflare.com/), using [D1 Database](https://developers.cloudflare.com/d1/) (SQLite) and [Drizzle ORM](https://orm.drizzle.team/).

## 📋 Overview

This backend service manages weekly guild war events for a game community, supporting two regions (VN and NA). It handles user signups, team assignments, and administrative controls for organizing guild events.

### Key Features

- **🗓️ Automated Weekly Events**: Events auto-created every Tuesday at 12:00 UTC via Cloudflare Cron Triggers
- **👥 User Signup System**: Players sign up without passwords using a simple form
- **🎯 Role-Based Access**: Admin accounts for event management, regular users for participation
- **🌏 Multi-Region Support**: Separate events and teams for VN and NA regions
- **⚔️ Team Management**: Admins can create, update, delete teams and assign users
- **🔄 Recurring User Recognition**: Returning users are automatically linked to new events
- **📊 Complete Event Tracking**: Signups, team assignments, and user roles

### Tech Stack

- **Runtime**: Cloudflare Workers (Edge compute)
- **Framework**: Hono (Fast web framework)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Package Manager**: Bun (also compatible with npm/pnpm/yarn)

## 🗄️ Database Schema

The application uses SQLite (via D1) with the following main tables:

- **users**: Player profiles with class/role info and admin status
- **events**: Weekly events tied to regions and start dates
- **teams**: Teams within events (default: Alpha, Beta, Gamma)
- **team_members**: Assignments of users to teams
- **event_signups**: Tracks which users signed up for which events

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository (if applicable)
git clone <your-repo-url>
cd anhtong-be

# Install dependencies
bun install
# or npm install
```

### Database Setup

#### Local Development

```bash
# Apply migrations to local D1 database
wrangler d1 migrations apply anhtong-guild-db --local

# Start the development server
bun run dev
# or npm run dev

# The API will be available at http://127.0.0.1:8787
```

#### Remote/Production Database

```bash
# Apply migrations to remote D1 database
wrangler d1 migrations apply anhtong-guild-db --remote
```

### Initial Data Seeding

After setting up the database, you need to seed the admin users and optionally create the first events:

```bash
# 1. Seed admin users (run this once)
curl -X POST http://127.0.0.1:8787/seed

# This creates two admin accounts:
# - Username: adminvn, Password: admin123@, Region: VN
# - Username: adminna, Password: admin123@, Region: NA

# 2. (Optional) Manually create weekly events for testing
curl -X POST http://127.0.0.1:8787/events/auto-create-weekly

# Note: Events are automatically created by the cron trigger every Tuesday at 12:00 UTC
```

**Important**: Change the admin passwords in production by updating [src/seed.ts](src/seed.ts) before running the seed command.

## 🔧 Development

### Available Scripts

```bash
# Start development server with hot reload
bun run dev

# Generate database migrations from schema changes
bun run db:generate

# Apply migrations (local)
wrangler d1 migrations apply anhtong-guild-db --local

# Apply migrations (remote)
wrangler d1 migrations apply anhtong-guild-db --remote

# Deploy to Cloudflare Workers
bun run deploy

# Generate TypeScript types for Cloudflare bindings
bun run cf-typegen
```

### Making Schema Changes

1. Edit [src/db/schema.ts](src/db/schema.ts)
2. Generate migration: `bun run db:generate`
3. Apply migration: `wrangler d1 migrations apply anhtong-guild-db --local`
4. Test your changes
5. Apply to remote: `wrangler d1 migrations apply anhtong-guild-db --remote`

## 📡 API Documentation

Base URL (local): `http://127.0.0.1:8787`

### Authentication

#### Admin Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "adminvn",
  "password": "admin123@"
}
```

**Response:**

```json
{
  "token": "base64-encoded-token",
  "user": {
    "id": 1,
    "username": "adminvn",
    "region": "vn",
    "isAdmin": true
  }
}
```

Use the token in subsequent requests:

```http
Authorization: Bearer <token>
```

#### Get Current User Profile

```http
GET /auth/me
Authorization: Bearer <token>
```

### User Signup

Regular users sign up for events without authentication:

```http
POST /auth/signup
Content-Type: application/json

{
  "username": "player123",
  "primaryClass": ["strategicSword", "heavenquakerSpear"],
  "secondaryClass": ["namelessSword", "namelessSpear"],
  "primaryRole": "dps",
  "secondaryRole": "tank",
  "region": "vn"
}
```

**Available Classes:**

- `strategicSword`, `heavenquakerSpear`, `namelessSword`, `namelessSpear`
- `vernalUmbrella`, `inkwellFan`, `soulshadeUmbrella`, `panaceaFan`
- `thundercryBlade`, `stormreakerSpear`, `infernalTwinblades`, `mortalRopeDart`

**Available Roles:** `dps`, `healer`, `tank`

**Response:**

```json
{
  "message": "Signed up successfully",
  "user": {
    "id": 3,
    "username": "player123",
    "primaryClass": ["strategicSword", "heavenquakerSpear"],
    "region": "vn"
  },
  "event": {
    "id": 1,
    "region": "vn",
    "weekStartDate": "2026-01-19T00:00:00.000Z"
  }
}
```

### Events

#### Get All Events

```http
GET /events
Authorization: Bearer <token>

# Optional: filter by region
GET /events?region=vn
```

#### Get Current Week's Event (Public)

```http
GET /events/current/:region
# Example: GET /events/current/vn
```

Returns event with all signups and team assignments.

#### Get Current Week's Event (Admin)

```http
GET /events/current
Authorization: Bearer <token>
```

Returns event for the admin's region.

#### Get Single Event

```http
GET /events/:id
Authorization: Bearer <token>
```

#### Create Weekly Event (Admin)

```http
POST /events/create-weekly
Authorization: Bearer <token>
```

Creates event for current week in the admin's region (if not exists).

#### Auto-Create Events (Cron)

```http
POST /events/auto-create-weekly
```

Creates events for both regions. Called by Cloudflare Cron Trigger.

### Teams

#### Get Teams for Event

```http
GET /teams/event/:eventId
Authorization: Bearer <token>
```

#### Get Single Team

```http
GET /teams/:id
Authorization: Bearer <token>
```

#### Create Team (Admin)

```http
POST /teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventId": 1,
  "name": "Team Delta",
  "description": "Fourth team"
}
```

#### Update Team (Admin)

```http
PUT /teams/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

#### Delete Team (Admin)

```http
DELETE /teams/:id
Authorization: Bearer <token>
```

#### Assign User to Team (Admin)

```http
POST /teams/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 3
}
```

#### Remove User from Team (Admin)

```http
DELETE /teams/:id/members/:userId
Authorization: Bearer <token>
```

### Users

#### Get All Users (Admin)

```http
GET /users
Authorization: Bearer <token>
```

Returns all users in the admin's region.

#### Get Single User

```http
GET /users/:id
Authorization: Bearer <token>
```

#### Update User Profile

```http
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "primaryClass": ["namelessSword", "namelessSpear"],
  "secondaryClass": ["strategicSword", "heavenquakerSpear"],
  "primaryRole": "tank",
  "secondaryRole": "dps"
}
```

Users can update their own profile. Admins can update users in their region.

#### Delete User (Admin)

```http
DELETE /users/:id
Authorization: Bearer <token>
```

## 🔐 Authentication & Authorization

- **Token-based**: Simple base64-encoded tokens (upgrade to JWT for production)
- **Admin-only endpoints**: Team/user management, event creation
- **Region isolation**: Admins can only manage resources in their region
- **Public endpoints**: User signup, current event viewing

## 🕐 Automated Event Creation

Events are automatically created via Cloudflare Cron Triggers:

- **Schedule**: Every Tuesday at 12:00 UTC (configured in [wrangler.jsonc](wrangler.jsonc))
- **Trigger**: `"0 12 * * 2"`
- **Action**: Creates events for both VN and NA regions if they don't exist
- **Default Teams**: Each new event gets 3 teams (Alpha, Beta, Gamma)

The cron handler is defined in [src/index.ts](src/index.ts) under the `scheduled` export.

## 📁 Project Structure

```
anhtong-be/
├── src/
│   ├── index.ts              # Main app & cron handler
│   ├── seed.ts               # Admin user seeding
│   ├── db/
│   │   └── schema.ts         # Database schema (Drizzle)
│   ├── lib/
│   │   ├── auth.ts           # Authentication & authorization
│   │   ├── db.ts             # Database connection
│   │   └── utils.ts          # Utility functions
│   └── routes/
│       ├── auth.ts           # Login & signup endpoints
│       ├── events.ts         # Event management
│       ├── teams.ts          # Team management
│       └── users.ts          # User management
├── drizzle/
│   └── migrations/           # Database migrations
├── drizzle.config.ts         # Drizzle configuration
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json
└── README.md
```

## 🚢 Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy to production
bun run deploy

# Apply migrations to remote database first
wrangler d1 migrations apply anhtong-guild-db --remote

# After deployment, seed admin users
curl -X POST https://your-worker.workers.dev/seed
```

### Environment Configuration

The D1 database binding is configured in [wrangler.jsonc](wrangler.jsonc):

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "anhtong-guild-db",
      "database_id": "your-database-id",
    },
  ],
}
```

## 🧪 Testing

### Manual Testing with curl

```bash
# 1. Seed admin users
curl -X POST http://127.0.0.1:8787/seed

# 2. Login as admin
TOKEN=$(curl -X POST http://127.0.0.1:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adminvn","password":"admin123@"}' \
  | jq -r '.token')

# 3. Create weekly event
curl -X POST http://127.0.0.1:8787/events/create-weekly \
  -H "Authorization: Bearer $TOKEN"

# 4. User signs up
curl -X POST http://127.0.0.1:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "primaryClass": ["strategicSword", "heavenquakerSpear"],
    "primaryRole": "dps",
    "region": "vn"
  }'

# 5. Get current event
curl http://127.0.0.1:8787/events/current/vn

# 6. Get all users (admin)
curl http://127.0.0.1:8787/users \
  -H "Authorization: Bearer $TOKEN"

# 7. Assign user to team (admin)
curl -X POST http://127.0.0.1:8787/teams/1/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 3}'
```

## 🔒 Security Considerations

**⚠️ Important for Production:**

1. **Change Default Passwords**: Update admin passwords in [src/seed.ts](src/seed.ts)
2. **Use JWT**: Replace base64 tokens with proper JWT implementation
3. **Add Rate Limiting**: Protect endpoints from abuse
4. **Secure Cron Endpoint**: Add authentication to `/events/auto-create-weekly`
5. **Use Strong Hashing**: Replace SHA-256 with bcrypt/argon2 for passwords
6. **CORS Configuration**: Restrict allowed origins in production
7. **Input Validation**: Add more robust validation and sanitization

## 📝 Common Tasks

### Adding a New Admin

1. Edit [src/seed.ts](src/seed.ts) and add the new admin account
2. Run the seed endpoint: `curl -X POST http://127.0.0.1:8787/seed`

### Manually Triggering Weekly Event Creation

```bash
curl -X POST http://127.0.0.1:8787/events/auto-create-weekly
```

### Viewing Database Content (Local)

```bash
# Open D1 console
wrangler d1 execute anhtong-guild-db --local --command "SELECT * FROM users"
wrangler d1 execute anhtong-guild-db --local --command "SELECT * FROM events"
wrangler d1 execute anhtong-guild-db --local --command "SELECT * FROM teams"
```

### Resetting Database (Local)

```bash
# Delete and recreate
rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*
wrangler d1 migrations apply anhtong-guild-db --local
curl -X POST http://127.0.0.1:8787/seed
```

## 🐛 Troubleshooting

### "Table does not exist" error

- Run migrations: `wrangler d1 migrations apply anhtong-guild-db --local`

### Admin login fails

- Ensure seed has been run: `curl -X POST http://127.0.0.1:8787/seed`
- Check password is `admin123@` (or your custom password)

### Events not auto-creating

- Check cron trigger in [wrangler.jsonc](wrangler.jsonc)
- Cron only works in deployed workers, not local dev
- Manually trigger: `curl -X POST http://127.0.0.1:8787/events/auto-create-weekly`

### Cannot assign users to teams

- Ensure user is signed up for the event first
- Verify user and team belong to same region
- Check admin has correct permissions

## 📚 Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

---

**Made with ❤️ for the AnhTong Guild community**
