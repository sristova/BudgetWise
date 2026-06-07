-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notify_budget" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_goal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_weekly" BOOLEAN NOT NULL DEFAULT true;
