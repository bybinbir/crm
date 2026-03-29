-- Migration: Add ISSMANAGER_EXPORT to ImportSourceType enum
-- Date: 2026-03-29 18:20 UTC
-- Author: Manual (Phase 049B)
-- Context: Phase 029 added ISSMANAGER_EXPORT to schema.prisma but migration was never created/run
-- This caused import endpoint to fail with: "Invalid input value for enum ImportSourceType"
-- Resolution: Manual enum value addition to production database

ALTER TYPE "ImportSourceType" ADD VALUE IF NOT EXISTS 'ISSMANAGER_EXPORT';

-- Verification:
-- SELECT unnest(enum_range(NULL::"ImportSourceType"));
-- Expected output should include: ISSMANAGER_EXPORT
