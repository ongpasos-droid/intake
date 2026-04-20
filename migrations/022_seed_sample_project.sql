-- ═══════════════════════════════════════════════════════════════
-- Migration 022: Seed sample project for oscarargumosa@gmail.com
-- Only inserts if user exists AND project ARISE doesn't exist yet
-- ═══════════════════════════════════════════════════════════════

SET @uid = (SELECT id FROM users WHERE email = 'oscarargumosa@gmail.com' LIMIT 1);
SET @existing = (SELECT id FROM projects WHERE user_id = @uid AND name = 'ARISE' LIMIT 1);
SET @pid = UUID();
SET @ctxid = UUID();

-- Only insert if user exists and project doesn't exist yet
INSERT INTO projects (id, user_id, name, type, description, start_date, duration_months,
  deadline, eu_grant, cofin_pct, indirect_pct, status, created_at, updated_at)
SELECT @pid, @uid,
  'ARISE', 'KA3-Youth',
  'Acción para la Resiliencia e Innovación Social en Europa — programa de bienestar mental juvenil a través de metodologías de aprendizaje no formal y redes transnacionales.',
  '2026-09-01', 24, '2026-03-15', 500000.00, 80, 7, 'draft', NOW(), NOW()
FROM dual WHERE @uid IS NOT NULL AND @existing IS NULL;

INSERT INTO partners (id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at)
SELECT UUID(), @pid, 'Permacultura Cantabria', 'Asociación Permacultura Cantabria', 'Santander', 'Spain', 'applicant', 1, NOW(), NOW()
FROM dual WHERE @uid IS NOT NULL AND @existing IS NULL;

INSERT INTO partners (id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at)
SELECT UUID(), @pid, 'CESIE', 'Centro Studi ed Iniziative Europeo', 'Palermo', 'Italy', 'partner', 2, NOW(), NOW()
FROM dual WHERE @uid IS NOT NULL AND @existing IS NULL;

INSERT INTO partners (id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at)
SELECT UUID(), @pid, 'Vrije Universiteit Brussel', 'Vrije Universiteit Brussel', 'Bruselas', 'Belgium', 'partner', 3, NOW(), NOW()
FROM dual WHERE @uid IS NOT NULL AND @existing IS NULL;

INSERT INTO intake_contexts (id, project_id, problem, target_groups, approach, created_at, updated_at)
SELECT @ctxid, @pid,
  'La crisis de salud mental juvenil constituye uno de los desafíos más urgentes de Europa. Según la OMS, el 20% de los jóvenes europeos de entre 15 y 29 años padece algún trastorno mental. La pandemia agravó esta situación: Eurostat (2024) muestra que el 41% reporta síntomas persistentes de ansiedad. Los sistemas de apoyo en los países del consorcio presentan déficits estructurales: escasa accesibilidad, ausencia de programas preventivos en organizaciones juveniles, y estigmatización social.',
  'Jóvenes de 18 a 29 años, con especial atención a jóvenes con menos oportunidades: entornos socioeconómicamente desfavorecidos, zonas rurales, y jóvenes con antecedentes migrantes. Trabajadores juveniles y educadores no formales de las organizaciones socias.',
  'ARISE desarrollará un marco metodológico innovador que combina técnicas de aprendizaje no formal con prácticas de bienestar mental basadas en evidencia. El proyecto creará: (1) un toolkit transnacional de intervención psicosocial juvenil, (2) un programa de formación para trabajadores juveniles en primeros auxilios psicológicos, y (3) una red europea de organizaciones juveniles especializadas en bienestar mental.',
  NOW(), NOW()
FROM dual WHERE @uid IS NOT NULL AND @existing IS NULL;
