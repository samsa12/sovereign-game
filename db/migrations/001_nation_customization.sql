-- Migration: Add bio and leader_title to nations
-- Run this against the existing database

-- Nation bio (displayed on nation profile)
ALTER TABLE nations ADD COLUMN bio TEXT DEFAULT '';

-- Leader title (e.g. "Supreme Chancellor", "Emperor", "President")
ALTER TABLE nations ADD COLUMN leader_title TEXT DEFAULT 'Leader';

-- Nation accent color for profile theming
ALTER TABLE nations ADD COLUMN accent_color TEXT DEFAULT '#3498db';
