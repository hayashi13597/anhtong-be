CREATE TABLE `scheduled_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`days` text,
	`region` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`notify_before_minutes` integer NOT NULL,
	`mention_role` text,
	`channel_id` text NOT NULL,
	`enabled` integer DEFAULT true,
	`created_at` integer
);
