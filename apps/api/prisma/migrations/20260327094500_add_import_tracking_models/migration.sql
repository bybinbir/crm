-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('CSV_UPLOAD', 'EXCEL_UPLOAD', 'ISSMANAGER_API', 'DATABASE_EXPORT', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('CUSTOMER', 'PERSONNEL', 'FINANCE', 'NEIGHBORHOOD');

-- AlterTable
ALTER TABLE "customer_snapshots" DROP COLUMN "issmanager_data",
ADD COLUMN     "source_batch_id" TEXT,
ADD COLUMN     "source_data" JSONB,
ADD COLUMN     "source_type" TEXT;

-- AlterTable
ALTER TABLE "finance_snapshots" DROP COLUMN "issmanager_data",
ADD COLUMN     "source_batch_id" TEXT,
ADD COLUMN     "source_data" JSONB,
ADD COLUMN     "source_type" TEXT;

-- AlterTable
ALTER TABLE "personnel_snapshots" DROP COLUMN "issmanager_data",
ADD COLUMN     "source_batch_id" TEXT,
ADD COLUMN     "source_data" JSONB,
ADD COLUMN     "source_type" TEXT;

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "source_type" "ImportSourceType" NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "file_name" TEXT,
    "file_size" INTEGER,
    "file_mime_type" TEXT,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "raw_data" JSONB NOT NULL,
    "normalized_data" JSONB,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "result_entity_id" TEXT,
    "result_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_number" INTEGER,
    "error_type" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_details" JSONB,
    "field_name" TEXT,
    "field_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_batches_status_idx" ON "import_batches"("status");

-- CreateIndex
CREATE INDEX "import_batches_entity_type_idx" ON "import_batches"("entity_type");

-- CreateIndex
CREATE INDEX "import_batches_created_by_user_id_idx" ON "import_batches"("created_by_user_id");

-- CreateIndex
CREATE INDEX "import_batches_created_at_idx" ON "import_batches"("created_at");

-- CreateIndex
CREATE INDEX "import_jobs_batch_id_idx" ON "import_jobs"("batch_id");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_row_number_idx" ON "import_jobs"("row_number");

-- CreateIndex
CREATE INDEX "import_errors_batch_id_idx" ON "import_errors"("batch_id");

-- CreateIndex
CREATE INDEX "import_errors_error_type_idx" ON "import_errors"("error_type");

-- CreateIndex
CREATE INDEX "customer_snapshots_source_batch_id_idx" ON "customer_snapshots"("source_batch_id");

-- CreateIndex
CREATE INDEX "finance_snapshots_source_batch_id_idx" ON "finance_snapshots"("source_batch_id");

-- CreateIndex
CREATE INDEX "personnel_snapshots_source_batch_id_idx" ON "personnel_snapshots"("source_batch_id");

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
