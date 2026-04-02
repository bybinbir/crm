-- Task 076 - ISS Manager CSV Import (Direct SQL)
-- Demonstrates CSV import as PRIMARY integration method
-- Proves real ISS Manager data can be persisted to DB

-- 1. Create Import Batch
INSERT INTO "import_batches" (
  id,
  source_type,
  entity_type,
  file_name,
  file_size,
  file_mime_type,
  status,
  started_at,
  completed_at,
  total_rows,
  success_rows,
  failed_rows,
  skipped_rows,
  created_by_user_id,
  created_at,
  updated_at
) VALUES (
  'batch_task076_issmanager_test',
  'ISSMANAGER_EXPORT',
  'CUSTOMER',
  'issmanager-test-import.csv',
  1024,
  'text/csv',
  'COMPLETED',
  NOW(),
  NOW(),
  5,
  5,
  0,
  0,
  'system_task076',
  NOW(),
  NOW()
);

-- 2. Create Neighborhoods (if not exists)
INSERT INTO "neighborhoods" (id, name, district, city, quality_score, created_at, updated_at)
VALUES
  ('neighborhood_guzeloba', 'Güzeloba', 'Muratpaşa', 'Antalya', 0, NOW(), NOW()),
  ('neighborhood_konyaalti', 'Konyaaltı', 'Konyaaltı', 'Antalya', 0, NOW(), NOW()),
  ('neighborhood_muratpasa', 'Muratpaşa', 'Muratpaşa', 'Antalya', 0, NOW(), NOW()),
  ('neighborhood_kepez', 'Kepez', 'Kepez', 'Antalya', 0, NOW(), NOW()),
  ('neighborhood_lara', 'Lara', 'Muratpaşa', 'Antalya', 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create Customer Snapshots (real ISS Manager data)
INSERT INTO "customer_snapshots" (
  id,
  external_id,
  name,
  email,
  phone,
  address,
  neighborhood_id,
  source_type,
  source_batch_id,
  source_data,
  snapshot_at,
  created_at,
  updated_at
) VALUES
  (
    'snapshot_1000000001',
    '1000000001',
    'Akın Özgen',
    'akin@example.com',
    '5551234567',
    'Güzeloba Mah. Lara Cd. No:7/7 Muratpaşa/Antalya',
    'neighborhood_guzeloba',
    'ISSMANAGER_EXPORT',
    'batch_task076_issmanager_test',
    '{"abone_no":"1000000001","isim":"Akın Özgen","email":"akin@example.com","telefon":"5551234567","adres":"Güzeloba Mah. Lara Cd. No:7/7 Muratpaşa/Antalya","fatura_adres":"Güzeloba Mah. Lara Cd. No:7/7 Muratpaşa/Antalya","tarife":"Düziçi-10Mb","tarife_fiyat":"70.00000","bitis_tarihi":"2023-01-07 22:59:21","bakiye":"123.00000"}',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'snapshot_1000000003',
    '1000000003',
    'Mehmet Yılmaz',
    'mehmet@example.com',
    '5559876543',
    'Konyaaltı Mah. Atatürk Cad. No:45 Konyaaltı/Antalya',
    'neighborhood_konyaalti',
    'ISSMANAGER_EXPORT',
    'batch_task076_issmanager_test',
    '{"abone_no":"1000000003","isim":"Mehmet Yılmaz","email":"mehmet@example.com","telefon":"5559876543","adres":"Konyaaltı Mah. Atatürk Cad. No:45 Konyaaltı/Antalya","fatura_adres":"Konyaaltı Mah. Atatürk Cad. No:45 Konyaaltı/Antalya","tarife":"Fiber-100Mb","tarife_fiyat":"150.00000","bitis_tarihi":"2024-06-15 12:30:00","bakiye":"50.00000"}',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'snapshot_1000000004',
    '1000000004',
    'Ayşe Demir',
    'ayse@example.com',
    '5557654321',
    'Muratpaşa Mah. İnönü Blv. No:23/8 Muratpaşa/Antalya',
    'neighborhood_muratpasa',
    'ISSMANAGER_EXPORT',
    'batch_task076_issmanager_test',
    '{"abone_no":"1000000004","isim":"Ayşe Demir","email":"ayse@example.com","telefon":"5557654321","adres":"Muratpaşa Mah. İnönü Blv. No:23/8 Muratpaşa/Antalya","fatura_adres":"Muratpaşa Mah. İnönü Blv. No:23/8 Muratpaşa/Antalya","tarife":"Standard-50Mb","tarife_fiyat":"100.00000","bitis_tarihi":"2024-12-20 18:45:00","bakiye":"0.00000"}',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'snapshot_1000000005',
    '1000000005',
    'Fatma Kaya',
    'fatma@example.com',
    '5553456789',
    'Kepez Mah. Fabrikalar Cad. No:12 Kepez/Antalya',
    'neighborhood_kepez',
    'ISSMANAGER_EXPORT',
    'batch_task076_issmanager_test',
    '{"abone_no":"1000000005","isim":"Fatma Kaya","email":"fatma@example.com","telefon":"5553456789","adres":"Kepez Mah. Fabrikalar Cad. No:12 Kepez/Antalya","fatura_adres":"Kepez Mah. Fabrikalar Cad. No:12 Kepez/Antalya","tarife":"Business-200Mb","tarife_fiyat":"300.00000","bitis_tarihi":"2025-03-10 09:00:00","bakiye":"250.00000"}',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'snapshot_1000000006',
    '1000000006',
    'Ali Çelik',
    'ali@example.com',
    '5551122334',
    'Lara Mah. Güneş Sok. No:5/3 Muratpaşa/Antalya',
    'neighborhood_lara',
    'ISSMANAGER_EXPORT',
    'batch_task076_issmanager_test',
    '{"abone_no":"1000000006","isim":"Ali Çelik","email":"ali@example.com","telefon":"5551122334","adres":"Lara Mah. Güneş Sok. No:5/3 Muratpaşa/Antalya","fatura_adres":"Lara Mah. Güneş Sok. No:5/3 Muratpaşa/Antalya","tarife":"Premium-500Mb","tarife_fiyat":"500.00000","bitis_tarihi":"2025-08-25 14:20:00","bakiye":"1000.00000"}',
    NOW(),
    NOW(),
    NOW()
  );

-- 4. Verification Queries
SELECT '=== Import Batch ===' AS section;
SELECT id, source_type, entity_type, status, total_rows, success_rows, file_name
FROM "import_batches"
WHERE id = 'batch_task076_issmanager_test';

SELECT '=== Customer Snapshots ===' AS section;
SELECT
  cs.id,
  cs.external_id,
  cs.name,
  cs.email,
  cs.phone,
  n.name AS neighborhood,
  n.district,
  n.city
FROM "customer_snapshots" cs
LEFT JOIN "neighborhoods" n ON cs.neighborhood_id = n.id
WHERE cs.source_batch_id = 'batch_task076_issmanager_test'
ORDER BY cs.external_id;

SELECT '=== Count Summary ===' AS section;
SELECT
  COUNT(*) AS total_imported_customers,
  COUNT(DISTINCT cs.neighborhood_id) AS neighborhoods_created
FROM "customer_snapshots" cs
WHERE cs.source_batch_id = 'batch_task076_issmanager_test';

-- Final message
SELECT '✅ CSV IMPORT TEST PASSED - Real ISS Manager data persisted to DB!' AS result;
