-- ── Erasmus+ eligibility fields + region classification ──────────
-- Añade participation_type y erasmus_region a ref_countries
-- Seed completo de países por región según Programme Guide 2024

-- Add columns safely (check if they exist first)
SET @db = DATABASE();

SET @has_pt = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ref_countries' AND COLUMN_NAME='participation_type');
SET @sql1 = IF(@has_pt = 0, "ALTER TABLE ref_countries ADD COLUMN participation_type ENUM('eu_member','associated','third_partial') NOT NULL DEFAULT 'eu_member'", 'SELECT 1');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @has_er = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ref_countries' AND COLUMN_NAME='erasmus_region');
SET @sql2 = IF(@has_er = 0, 'ALTER TABLE ref_countries ADD COLUMN erasmus_region TINYINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ── Actualizar países EU ya existentes ───────────────────────────
UPDATE ref_countries SET participation_type='eu_member' WHERE eu_member=1;

-- ── Países asociados (participación total, no EU) ─────────────────
-- Islandia, Liechtenstein, Noruega, Macedonia del Norte, Serbia, Turquía
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'IS','Islandia',         'Iceland',          0,1,'A','associated',NULL),
  (UUID(),'LI','Liechtenstein',    'Liechtenstein',    0,1,'A','associated',NULL),
  (UUID(),'NO','Noruega',          'Norway',           0,1,'A','associated',NULL),
  (UUID(),'MK','Macedonia del Norte','North Macedonia',0,1,'D','associated',NULL),
  (UUID(),'RS','Serbia',           'Serbia',           0,1,'D','associated',NULL),
  (UUID(),'TR','Turquía',          'Türkiye',          0,1,'C','associated',NULL)
ON DUPLICATE KEY UPDATE participation_type='associated', erasmus_eligible=1;

-- ── Región 1: Balcanes Occidentales ──────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AL','Albania',          'Albania',          0,1,'D','third_partial',1),
  (UUID(),'BA','Bosnia y Herzegovina','Bosnia and Herzegovina',0,1,'D','third_partial',1),
  (UUID(),'XK','Kosovo',           'Kosovo',           0,1,'D','third_partial',1),
  (UUID(),'ME','Montenegro',       'Montenegro',       0,1,'D','third_partial',1)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=1;

-- ── Región 2: Vecindad Este ───────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AM','Armenia',          'Armenia',          0,1,'D','third_partial',2),
  (UUID(),'AZ','Azerbaiyán',       'Azerbaijan',       0,1,'D','third_partial',2),
  (UUID(),'BY','Bielorrusia',      'Belarus',          0,0,'D','third_partial',2),
  (UUID(),'GE','Georgia',          'Georgia',          0,0,'D','third_partial',2),
  (UUID(),'MD','Moldavia',         'Moldova',          0,1,'D','third_partial',2),
  (UUID(),'UA','Ucrania',          'Ukraine',          0,1,'D','third_partial',2)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=2;

-- ── Región 3: Mediterráneo Sur ────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'DZ','Argelia',          'Algeria',          0,1,'D','third_partial',3),
  (UUID(),'EG','Egipto',           'Egypt',            0,1,'D','third_partial',3),
  (UUID(),'IL','Israel',           'Israel',           0,1,'B','third_partial',3),
  (UUID(),'JO','Jordania',         'Jordan',           0,1,'D','third_partial',3),
  (UUID(),'LB','Líbano',           'Lebanon',          0,1,'D','third_partial',3),
  (UUID(),'LY','Libia',            'Libya',            0,1,'D','third_partial',3),
  (UUID(),'MA','Marruecos',        'Morocco',          0,1,'D','third_partial',3),
  (UUID(),'PS','Palestina',        'Palestine',        0,1,'D','third_partial',3),
  (UUID(),'SY','Siria',            'Syria',            0,1,'D','third_partial',3),
  (UUID(),'TN','Túnez',            'Tunisia',          0,1,'D','third_partial',3)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=3;

-- ── Región 4: Federación Rusa ─────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'RU','Rusia',            'Russian Federation',0,0,'C','third_partial',4)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=4;

-- ── Región 5: Asia ────────────────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'BD','Bangladés',        'Bangladesh',       0,1,'D','third_partial',5),
  (UUID(),'BT','Bután',            'Bhutan',           0,1,'D','third_partial',5),
  (UUID(),'KH','Camboya',          'Cambodia',         0,1,'D','third_partial',5),
  (UUID(),'CN','China',            'China',            0,1,'C','third_partial',5),
  (UUID(),'KP','Corea del Norte',  'DPR Korea',        0,1,'D','third_partial',5),
  (UUID(),'IN','India',            'India',            0,1,'D','third_partial',5),
  (UUID(),'ID','Indonesia',        'Indonesia',        0,1,'D','third_partial',5),
  (UUID(),'LA','Laos',             'Laos',             0,1,'D','third_partial',5),
  (UUID(),'MY','Malasia',          'Malaysia',         0,1,'C','third_partial',5),
  (UUID(),'MV','Maldivas',         'Maldives',         0,1,'D','third_partial',5),
  (UUID(),'MN','Mongolia',         'Mongolia',         0,1,'D','third_partial',5),
  (UUID(),'MM','Myanmar',          'Myanmar',          0,1,'D','third_partial',5),
  (UUID(),'NP','Nepal',            'Nepal',            0,1,'D','third_partial',5),
  (UUID(),'PK','Pakistán',         'Pakistan',         0,1,'D','third_partial',5),
  (UUID(),'PH','Filipinas',        'Philippines',      0,1,'D','third_partial',5),
  (UUID(),'LK','Sri Lanka',        'Sri Lanka',        0,1,'D','third_partial',5),
  (UUID(),'TH','Tailandia',        'Thailand',         0,1,'C','third_partial',5),
  (UUID(),'VN','Vietnam',          'Vietnam',          0,1,'D','third_partial',5),
  -- 5b high income
  (UUID(),'BN','Brunéi',           'Brunei',           0,1,'A','third_partial',5),
  (UUID(),'HK','Hong Kong',        'Hong Kong',        0,1,'A','third_partial',5),
  (UUID(),'JP','Japón',            'Japan',            0,1,'A','third_partial',5),
  (UUID(),'KR','Corea del Sur',    'Republic of Korea',0,1,'A','third_partial',5),
  (UUID(),'MO','Macao',            'Macao',            0,1,'A','third_partial',5),
  (UUID(),'SG','Singapur',         'Singapore',        0,1,'A','third_partial',5),
  (UUID(),'TW','Taiwán',           'Taiwan',           0,1,'A','third_partial',5)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=5;

-- ── Región 6: Asia Central ────────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AF','Afganistán',       'Afghanistan',      0,1,'D','third_partial',6),
  (UUID(),'KZ','Kazajistán',       'Kazakhstan',       0,1,'D','third_partial',6),
  (UUID(),'KG','Kirguistán',       'Kyrgyzstan',       0,1,'D','third_partial',6),
  (UUID(),'TJ','Tayikistán',       'Tajikistan',       0,1,'D','third_partial',6),
  (UUID(),'TM','Turkmenistán',     'Turkmenistan',     0,1,'D','third_partial',6),
  (UUID(),'UZ','Uzbekistán',       'Uzbekistan',       0,1,'D','third_partial',6)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=6;

-- ── Región 7: Oriente Medio ───────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'IR','Irán',             'Iran',             0,1,'D','third_partial',7),
  (UUID(),'IQ','Irak',             'Iraq',             0,1,'D','third_partial',7),
  (UUID(),'YE','Yemen',            'Yemen',            0,1,'D','third_partial',7),
  -- 7b high income
  (UUID(),'BH','Baréin',           'Bahrain',          0,1,'A','third_partial',7),
  (UUID(),'KW','Kuwait',           'Kuwait',           0,1,'A','third_partial',7),
  (UUID(),'OM','Omán',             'Oman',             0,1,'A','third_partial',7),
  (UUID(),'QA','Catar',            'Qatar',            0,1,'A','third_partial',7),
  (UUID(),'SA','Arabia Saudí',     'Saudi Arabia',     0,1,'A','third_partial',7),
  (UUID(),'AE','Emiratos Árabes',  'United Arab Emirates',0,1,'A','third_partial',7)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=7;

-- ── Región 8: Pacífico ────────────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'FJ','Fiyi',             'Fiji',             0,1,'D','third_partial',8),
  (UUID(),'KI','Kiribati',         'Kiribati',         0,1,'D','third_partial',8),
  (UUID(),'PG','Papúa Nueva Guinea','Papua New Guinea',0,1,'D','third_partial',8),
  (UUID(),'WS','Samoa',            'Samoa',            0,1,'D','third_partial',8),
  (UUID(),'SB','Islas Salomón',    'Solomon Islands',  0,1,'D','third_partial',8),
  (UUID(),'TL','Timor-Leste',      'Timor-Leste',      0,1,'D','third_partial',8),
  (UUID(),'TO','Tonga',            'Tonga',            0,1,'D','third_partial',8),
  (UUID(),'VU','Vanuatu',          'Vanuatu',          0,1,'D','third_partial',8),
  -- 8b high income
  (UUID(),'AU','Australia',        'Australia',        0,1,'A','third_partial',8),
  (UUID(),'NZ','Nueva Zelanda',    'New Zealand',      0,1,'A','third_partial',8)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=8;

-- ── Región 9: África Subsahariana ────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AO','Angola',           'Angola',           0,1,'D','third_partial',9),
  (UUID(),'BJ','Benín',            'Benin',            0,1,'D','third_partial',9),
  (UUID(),'BW','Botsuana',         'Botswana',         0,1,'D','third_partial',9),
  (UUID(),'BF','Burkina Faso',     'Burkina Faso',     0,1,'D','third_partial',9),
  (UUID(),'BI','Burundi',          'Burundi',          0,1,'D','third_partial',9),
  (UUID(),'CM','Camerún',          'Cameroon',         0,1,'D','third_partial',9),
  (UUID(),'CV','Cabo Verde',       'Cabo Verde',       0,1,'D','third_partial',9),
  (UUID(),'CF','Rep. Centroafricana','Central African Republic',0,1,'D','third_partial',9),
  (UUID(),'TD','Chad',             'Chad',             0,1,'D','third_partial',9),
  (UUID(),'KM','Comoras',          'Comoros',          0,1,'D','third_partial',9),
  (UUID(),'CG','Congo',            'Congo',            0,1,'D','third_partial',9),
  (UUID(),'CD','Congo (RD)',        'Congo - Democratic Republic',0,1,'D','third_partial',9),
  (UUID(),'CI','Costa de Marfil',  'Côte d\'Ivoire',   0,1,'D','third_partial',9),
  (UUID(),'DJ','Yibuti',           'Djibouti',         0,1,'D','third_partial',9),
  (UUID(),'GQ','Guinea Ecuatorial','Equatorial Guinea',0,1,'D','third_partial',9),
  (UUID(),'ER','Eritrea',          'Eritrea',          0,1,'D','third_partial',9),
  (UUID(),'SZ','Esuatini',         'Eswatini',         0,1,'D','third_partial',9),
  (UUID(),'ET','Etiopía',          'Ethiopia',         0,1,'D','third_partial',9),
  (UUID(),'GA','Gabón',            'Gabon',            0,1,'D','third_partial',9),
  (UUID(),'GM','Gambia',           'Gambia',           0,1,'D','third_partial',9),
  (UUID(),'GH','Ghana',            'Ghana',            0,1,'D','third_partial',9),
  (UUID(),'GN','Guinea',           'Guinea',           0,1,'D','third_partial',9),
  (UUID(),'GW','Guinea-Bisáu',     'Guinea-Bissau',    0,1,'D','third_partial',9),
  (UUID(),'KE','Kenia',            'Kenya',            0,1,'D','third_partial',9),
  (UUID(),'LS','Lesoto',           'Lesotho',          0,1,'D','third_partial',9),
  (UUID(),'LR','Liberia',          'Liberia',          0,1,'D','third_partial',9),
  (UUID(),'MG','Madagascar',       'Madagascar',       0,1,'D','third_partial',9),
  (UUID(),'MW','Malaui',           'Malawi',           0,1,'D','third_partial',9),
  (UUID(),'ML','Malí',             'Mali',             0,1,'D','third_partial',9),
  (UUID(),'MR','Mauritania',       'Mauritania',       0,1,'D','third_partial',9),
  (UUID(),'MU','Mauricio',         'Mauritius',        0,1,'D','third_partial',9),
  (UUID(),'MZ','Mozambique',       'Mozambique',       0,1,'D','third_partial',9),
  (UUID(),'NA','Namibia',          'Namibia',          0,1,'D','third_partial',9),
  (UUID(),'NE','Níger',            'Niger',            0,1,'D','third_partial',9),
  (UUID(),'NG','Nigeria',          'Nigeria',          0,1,'D','third_partial',9),
  (UUID(),'RW','Ruanda',           'Rwanda',           0,1,'D','third_partial',9),
  (UUID(),'ST','Santo Tomé y Príncipe','Sao Tome and Principe',0,1,'D','third_partial',9),
  (UUID(),'SN','Senegal',          'Senegal',          0,1,'D','third_partial',9),
  (UUID(),'SC','Seychelles',       'Seychelles',       0,1,'C','third_partial',9),
  (UUID(),'SL','Sierra Leona',     'Sierra Leone',     0,1,'D','third_partial',9),
  (UUID(),'SO','Somalia',          'Somalia',          0,1,'D','third_partial',9),
  (UUID(),'ZA','Sudáfrica',        'South Africa',     0,1,'D','third_partial',9),
  (UUID(),'SS','Sudán del Sur',    'South Sudan',      0,1,'D','third_partial',9),
  (UUID(),'SD','Sudán',            'Sudan',            0,1,'D','third_partial',9),
  (UUID(),'TZ','Tanzania',         'Tanzania',         0,1,'D','third_partial',9),
  (UUID(),'TG','Togo',             'Togo',             0,1,'D','third_partial',9),
  (UUID(),'UG','Uganda',           'Uganda',           0,1,'D','third_partial',9),
  (UUID(),'ZM','Zambia',           'Zambia',           0,1,'D','third_partial',9),
  (UUID(),'ZW','Zimbabue',         'Zimbabwe',         0,1,'D','third_partial',9)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=9;

-- ── Región 10: Latinoamérica ──────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AR','Argentina',        'Argentina',        0,1,'C','third_partial',10),
  (UUID(),'BO','Bolivia',          'Bolivia',          0,1,'D','third_partial',10),
  (UUID(),'BR','Brasil',           'Brazil',           0,1,'C','third_partial',10),
  (UUID(),'CL','Chile',            'Chile',            0,1,'C','third_partial',10),
  (UUID(),'CO','Colombia',         'Colombia',         0,1,'D','third_partial',10),
  (UUID(),'CR','Costa Rica',       'Costa Rica',       0,1,'C','third_partial',10),
  (UUID(),'EC','Ecuador',          'Ecuador',          0,1,'D','third_partial',10),
  (UUID(),'SV','El Salvador',      'El Salvador',      0,1,'D','third_partial',10),
  (UUID(),'GT','Guatemala',        'Guatemala',        0,1,'D','third_partial',10),
  (UUID(),'HN','Honduras',         'Honduras',         0,1,'D','third_partial',10),
  (UUID(),'MX','México',           'Mexico',           0,1,'C','third_partial',10),
  (UUID(),'NI','Nicaragua',        'Nicaragua',        0,1,'D','third_partial',10),
  (UUID(),'PA','Panamá',           'Panama',           0,1,'C','third_partial',10),
  (UUID(),'PY','Paraguay',         'Paraguay',         0,1,'D','third_partial',10),
  (UUID(),'PE','Perú',             'Peru',             0,1,'D','third_partial',10),
  (UUID(),'UY','Uruguay',          'Uruguay',          0,1,'C','third_partial',10),
  (UUID(),'VE','Venezuela',        'Venezuela',        0,1,'D','third_partial',10)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=10;

-- ── Región 11: Caribe ─────────────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AG','Antigua y Barbuda','Antigua & Barbuda', 0,1,'C','third_partial',11),
  (UUID(),'BS','Bahamas',          'Bahamas',           0,1,'B','third_partial',11),
  (UUID(),'BB','Barbados',         'Barbados',          0,1,'C','third_partial',11),
  (UUID(),'BZ','Belice',           'Belize',            0,1,'D','third_partial',11),
  (UUID(),'CU','Cuba',             'Cuba',              0,1,'D','third_partial',11),
  (UUID(),'DM','Dominica',         'Dominica',          0,1,'D','third_partial',11),
  (UUID(),'DO','República Dominicana','Dominican Republic',0,1,'D','third_partial',11),
  (UUID(),'GD','Granada',          'Grenada',           0,1,'D','third_partial',11),
  (UUID(),'GY','Guyana',           'Guyana',            0,1,'D','third_partial',11),
  (UUID(),'HT','Haití',            'Haiti',             0,1,'D','third_partial',11),
  (UUID(),'JM','Jamaica',          'Jamaica',           0,1,'D','third_partial',11),
  (UUID(),'KN','San Cristóbal y Nieves','St Kitts and Nevis',0,1,'D','third_partial',11),
  (UUID(),'LC','Santa Lucía',      'St Lucia',          0,1,'D','third_partial',11),
  (UUID(),'VC','San Vicente y Granadinas','St Vincent & Grenadines',0,1,'D','third_partial',11),
  (UUID(),'SR','Surinam',          'Suriname',          0,1,'D','third_partial',11),
  (UUID(),'TT','Trinidad y Tobago','Trinidad & Tobago', 0,1,'C','third_partial',11)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=11;

-- ── Región 12: EEUU y Canadá ──────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'US','Estados Unidos',   'United States of America',0,1,'A','third_partial',12),
  (UUID(),'CA','Canadá',           'Canada',           0,1,'A','third_partial',12)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=12;

-- ── Región 13: Microestados europeos ─────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'AD','Andorra',          'Andorra',          0,1,'A','third_partial',13),
  (UUID(),'MC','Mónaco',           'Monaco',           0,1,'A','third_partial',13),
  (UUID(),'SM','San Marino',       'San Marino',       0,1,'A','third_partial',13),
  (UUID(),'VA','Ciudad del Vaticano','Vatican City State',0,1,'A','third_partial',13)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=13;

-- ── Región 14: Otros europeos ─────────────────────────────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, participation_type, erasmus_region)
VALUES
  (UUID(),'FO','Islas Feroe',      'Faroe Islands',    0,1,'A','third_partial',14),
  (UUID(),'CH','Suiza',            'Switzerland',      0,1,'A','third_partial',14),
  (UUID(),'GB','Reino Unido',      'United Kingdom',   0,1,'A','third_partial',14)
ON DUPLICATE KEY UPDATE participation_type='third_partial', erasmus_region=14;

-- ── Tabla de nombres de regiones ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ref_erasmus_regions (
  id         TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  name_es    VARCHAR(100) NOT NULL,
  name_en    VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ref_erasmus_regions (id, name_es, name_en) VALUES
  (1,  'Balcanes Occidentales',    'Western Balkans'),
  (2,  'Vecindad Este',            'Neighbourhood East'),
  (3,  'Mediterráneo Sur',         'South-Mediterranean'),
  (4,  'Federación Rusa',          'Russian Federation'),
  (5,  'Asia',                     'Asia'),
  (6,  'Asia Central',             'Central Asia'),
  (7,  'Oriente Medio',            'Middle East'),
  (8,  'Pacífico',                 'Pacific'),
  (9,  'África Subsahariana',      'Sub-Saharan Africa'),
  (10, 'Latinoamérica',            'Latin America'),
  (11, 'Caribe',                   'Caribbean'),
  (12, 'EEUU y Canadá',            'US and Canada'),
  (13, 'Microestados europeos',    'European Microstates'),
  (14, 'Otros europeos',           'Other European countries')
ON DUPLICATE KEY UPDATE name_es=VALUES(name_es);
