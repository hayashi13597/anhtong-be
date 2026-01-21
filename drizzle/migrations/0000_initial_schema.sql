-- Migration: Create initial schema
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT,
  is_admin INTEGER DEFAULT 0,
  classes TEXT,
  role TEXT CHECK(role IN ('dps', 'healer', 'tank')),
  region TEXT NOT NULL CHECK(region IN ('vn', 'na')),
  created_at INTEGER
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region TEXT NOT NULL CHECK(region IN ('vn', 'na')),
  week_start_date INTEGER NOT NULL,
  created_at INTEGER
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER
);

-- Team members join table
CREATE TABLE IF NOT EXISTS team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at INTEGER,
  PRIMARY KEY (team_id, user_id)
);

-- Event signups - tracks user participation per event
CREATE TABLE IF NOT EXISTS event_signups (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signed_up_at INTEGER,
  PRIMARY KEY (event_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
CREATE INDEX IF NOT EXISTS idx_events_week_start ON events(week_start_date);
CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_event_signups_event ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_user ON event_signups(user_id);
