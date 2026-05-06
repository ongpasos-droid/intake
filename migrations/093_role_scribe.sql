-- Add 'scribe' role to users.role ENUM.
-- Scribes can access Admin → Data E+ (calls, eligibility, eval, forms, entities,
-- per diems, workers, countries) but NOT Documents/Subscribers/Research-admin.
-- Idempotent: re-running with the same enum values is a no-op.

ALTER TABLE users MODIFY COLUMN role ENUM('admin','user','writer','scribe') NOT NULL DEFAULT 'user';
