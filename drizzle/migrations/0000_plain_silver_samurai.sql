CREATE TABLE `event_signups` (
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`signed_up_at` integer,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`region` text NOT NULL,
	`week_start_date` integer NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`assigned_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`is_admin` integer DEFAULT false,
	`primary_class` text NOT NULL,
	`secondary_class` text,
	`primary_role` text NOT NULL,
	`secondary_role` text,
	`region` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);