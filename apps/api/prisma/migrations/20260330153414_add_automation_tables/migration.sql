-- CreateEnum
CREATE TYPE "AutomationJobType" AS ENUM ('ISSMANAGER_EXPORT_IMPORT');

-- CreateEnum
CREATE TYPE "AutomationJobStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'RUNNING', 'EXPORTING', 'IMPORTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('SCHEDULED', 'MANUAL');

-- AlterEnum
ALTER TYPE "ImportSourceType" ADD VALUE 'ISSMANAGER_EXPORT';

-- CreateTable
CREATE TABLE "automation_schedules" (
    "id" TEXT NOT NULL,
    "integration_config_id" TEXT NOT NULL,
    "job_type" "AutomationJobType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "next_scheduled_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "job_type" "AutomationJobType" NOT NULL,
    "status" "AutomationJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "trigger_type" "AutomationTriggerType" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "downloaded_file" TEXT,
    "staging_file_path" TEXT,
    "import_batch_id" TEXT,
    "files_processed" INTEGER NOT NULL DEFAULT 0,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_succeeded" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_details" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_schedules_is_enabled_idx" ON "automation_schedules"("is_enabled");

-- CreateIndex
CREATE INDEX "automation_schedules_next_scheduled_run_at_idx" ON "automation_schedules"("next_scheduled_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "automation_schedules_integration_config_id_job_type_key" ON "automation_schedules"("integration_config_id", "job_type");

-- CreateIndex
CREATE INDEX "automation_jobs_schedule_id_idx" ON "automation_jobs"("schedule_id");

-- CreateIndex
CREATE INDEX "automation_jobs_status_idx" ON "automation_jobs"("status");

-- CreateIndex
CREATE INDEX "automation_jobs_job_type_idx" ON "automation_jobs"("job_type");

-- CreateIndex
CREATE INDEX "automation_jobs_created_at_idx" ON "automation_jobs"("created_at");

-- CreateIndex
CREATE INDEX "automation_jobs_locked_at_idx" ON "automation_jobs"("locked_at");

-- AddForeignKey
ALTER TABLE "automation_schedules" ADD CONSTRAINT "automation_schedules_integration_config_id_fkey" FOREIGN KEY ("integration_config_id") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "automation_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
