Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ANALYST');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'INTEGRATION_CREATED', 'INTEGRATION_UPDATED', 'INTEGRATION_DELETED', 'INTEGRATION_TESTED', 'SYNC_STARTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'CONFIG_CHANGED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('ISSMANAGER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'ISSMANAGER',
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_key_encrypted" TEXT NOT NULL,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "last_test_at" TIMESTAMP(3),
    "last_test_status" TEXT,
    "last_test_message" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_runs" (
    "id" TEXT NOT NULL,
    "integration_config_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_succeeded" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "integration_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT,
    "quality_score" DOUBLE PRECISION,
    "quality_score_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_snapshots" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "neighborhood_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "issmanager_data" JSONB,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel_snapshots" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "performance_score" DOUBLE PRECISION,
    "issmanager_data" JSONB,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_snapshots" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "transaction_type" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'TRY',
    "date" TIMESTAMP(3),
    "issmanager_data" JSONB,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "integration_configs_provider_idx" ON "integration_configs"("provider");

-- CreateIndex
CREATE INDEX "integration_configs_is_enabled_idx" ON "integration_configs"("is_enabled");

-- CreateIndex
CREATE INDEX "integration_sync_runs_integration_config_id_idx" ON "integration_sync_runs"("integration_config_id");

-- CreateIndex
CREATE INDEX "integration_sync_runs_status_idx" ON "integration_sync_runs"("status");

-- CreateIndex
CREATE INDEX "integration_sync_runs_started_at_idx" ON "integration_sync_runs"("started_at");

-- CreateIndex
CREATE INDEX "neighborhoods_city_district_idx" ON "neighborhoods"("city", "district");

-- CreateIndex
CREATE INDEX "neighborhoods_quality_score_idx" ON "neighborhoods"("quality_score");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_name_district_city_key" ON "neighborhoods"("name", "district", "city");

-- CreateIndex
CREATE INDEX "customer_snapshots_external_id_idx" ON "customer_snapshots"("external_id");

-- CreateIndex
CREATE INDEX "customer_snapshots_neighborhood_id_idx" ON "customer_snapshots"("neighborhood_id");

-- CreateIndex
CREATE INDEX "customer_snapshots_snapshot_at_idx" ON "customer_snapshots"("snapshot_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_snapshots_external_id_snapshot_at_key" ON "customer_snapshots"("external_id", "snapshot_at");

-- CreateIndex
CREATE INDEX "personnel_snapshots_external_id_idx" ON "personnel_snapshots"("external_id");

-- CreateIndex
CREATE INDEX "personnel_snapshots_snapshot_at_idx" ON "personnel_snapshots"("snapshot_at");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_snapshots_external_id_snapshot_at_key" ON "personnel_snapshots"("external_id", "snapshot_at");

-- CreateIndex
CREATE INDEX "finance_snapshots_external_id_idx" ON "finance_snapshots"("external_id");

-- CreateIndex
CREATE INDEX "finance_snapshots_date_idx" ON "finance_snapshots"("date");

-- CreateIndex
CREATE INDEX "finance_snapshots_snapshot_at_idx" ON "finance_snapshots"("snapshot_at");

-- CreateIndex
CREATE UNIQUE INDEX "finance_snapshots_external_id_snapshot_at_key" ON "finance_snapshots"("external_id", "snapshot_at");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_integration_config_id_fkey" FOREIGN KEY ("integration_config_id") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_snapshots" ADD CONSTRAINT "customer_snapshots_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

