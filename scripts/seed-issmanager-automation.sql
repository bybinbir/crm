-- ============================================
-- ISS Manager Auto-Sync Integration + Schedule Seed
-- ============================================
-- Purpose: Enable production auto-sync for ISS Manager
-- Date: 2026-04-01
-- Report: CRM-ANALIZ-ISSMANAGER-AUTO-SYNC-VERIFY-065
--
-- IMPORTANT: Replace ISSMANAGER_API_KEY_PLACEHOLDER with real API key
-- before running in production
-- ============================================

BEGIN;

-- 1. Insert ISS Manager Integration Config
-- Uses admin user: cmnascdsd0000apixizh182a4
-- API key encrypted with production ENCRYPTION_KEY
INSERT INTO integration_configs (
  id,
  provider,
  name,
  base_url,
  api_key_encrypted,
  timeout_ms,
  is_enabled,
  status,
  created_at,
  updated_at,
  created_by_id,
  updated_by_id
) VALUES (
  'cmxissmanager00000001',
  'ISSMANAGER',
  'ISS Manager CRM Integration',
  'https://iss-manager.example.com/api',
  '573e1da26c6f854c07c50fbade239924:71cb6bf85e08591368dc3e70fa873115:88b4a46ad82ca0ef4da1050679a130d50a621909379a5f3595c146b9792b',
  30000,
  true,
  'PENDING',
  NOW(),
  NOW(),
  'cmnascdsd0000apixizh182a4',
  'cmnascdsd0000apixizh182a4'
)
ON CONFLICT (id) DO UPDATE SET
  api_key_encrypted = EXCLUDED.api_key_encrypted,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

-- 2. Insert Auto-Sync Schedule
-- Runs daily at 18:00 Istanbul time
-- Cron: "0 18 * * *" = Every day at 6:00 PM
INSERT INTO automation_schedules (
  id,
  integration_config_id,
  job_type,
  is_enabled,
  cron_expression,
  timezone,
  next_scheduled_run_at,
  created_at,
  updated_at
) VALUES (
  'cmxschedule00000001',
  'cmxissmanager00000001',
  'ISSMANAGER_EXPORT_IMPORT',
  true,
  '0 18 * * *',
  'Europe/Istanbul',
  NULL, -- Will be calculated by scheduler
  NOW(),
  NOW()
)
ON CONFLICT (integration_config_id, job_type) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  cron_expression = EXCLUDED.cron_expression,
  updated_at = NOW();

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these after seed to verify:

-- Check integration config exists
-- SELECT id, provider, name, is_enabled, status FROM integration_configs WHERE provider = 'ISSMANAGER';

-- Check schedule exists and is enabled
-- SELECT id, integration_config_id, job_type, is_enabled, cron_expression FROM automation_schedules WHERE job_type = 'ISSMANAGER_EXPORT_IMPORT';

-- Check scheduler picks it up (run after API restart)
-- SELECT id, status, trigger_type, created_at FROM automation_jobs WHERE job_type = 'ISSMANAGER_EXPORT_IMPORT' ORDER BY created_at DESC LIMIT 5;
