/**
 * Migration 094: full schema for the v2 D+MS system.
 *
 * Idempotent. Re-runnable. All ALTERs guarded by information_schema lookups
 * because MySQL 8 does NOT support `ADD COLUMN IF NOT EXISTS`.
 *
 * Adds:
 *   deliverables.rationale            TEXT       — why this D exists (proposal narrative)
 *   deliverables.kpi                  VARCHAR    — verifiable indicator (e.g. "≥50 attendees")
 *   deliverables.last_critic_score    DECIMAL    — last EACEA-critic score (0–5)
 *   deliverables.last_critic_run_at   DATETIME   — when that score was produced
 *
 *   milestones.rationale              TEXT       — same idea
 *   milestones.kind                   VARCHAR    — 'kickoff' | 'deliverable' | 'closure'
 *   milestones.last_critic_score      DECIMAL
 *   milestones.last_critic_run_at     DATETIME
 *
 * New tables:
 *   dms_comments     — per-row threaded notes (Oscar + future collaborators)
 *   dms_snapshots    — pre-apply snapshots so we can offer "Restore previous version"
 */
'use strict';

async function _hasColumn(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

module.exports = async function (conn) {
  // ── deliverables ──
  if (!await _hasColumn(conn, 'deliverables', 'rationale')) {
    await conn.execute(`ALTER TABLE deliverables ADD COLUMN rationale TEXT NULL`);
    console.log('  ✓ deliverables.rationale');
  }
  if (!await _hasColumn(conn, 'deliverables', 'kpi')) {
    await conn.execute(`ALTER TABLE deliverables ADD COLUMN kpi VARCHAR(255) NULL`);
    console.log('  ✓ deliverables.kpi');
  }
  if (!await _hasColumn(conn, 'deliverables', 'last_critic_score')) {
    await conn.execute(`ALTER TABLE deliverables ADD COLUMN last_critic_score DECIMAL(3,1) NULL`);
    console.log('  ✓ deliverables.last_critic_score');
  }
  if (!await _hasColumn(conn, 'deliverables', 'last_critic_run_at')) {
    await conn.execute(`ALTER TABLE deliverables ADD COLUMN last_critic_run_at DATETIME NULL`);
    console.log('  ✓ deliverables.last_critic_run_at');
  }

  // ── milestones ──
  if (!await _hasColumn(conn, 'milestones', 'rationale')) {
    await conn.execute(`ALTER TABLE milestones ADD COLUMN rationale TEXT NULL`);
    console.log('  ✓ milestones.rationale');
  }
  if (!await _hasColumn(conn, 'milestones', 'kind')) {
    await conn.execute(`ALTER TABLE milestones ADD COLUMN kind VARCHAR(20) NULL`);
    console.log('  ✓ milestones.kind');
  }
  if (!await _hasColumn(conn, 'milestones', 'last_critic_score')) {
    await conn.execute(`ALTER TABLE milestones ADD COLUMN last_critic_score DECIMAL(3,1) NULL`);
    console.log('  ✓ milestones.last_critic_score');
  }
  if (!await _hasColumn(conn, 'milestones', 'last_critic_run_at')) {
    await conn.execute(`ALTER TABLE milestones ADD COLUMN last_critic_run_at DATETIME NULL`);
    console.log('  ✓ milestones.last_critic_run_at');
  }

  // ── new tables ──
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS dms_comments (
      id              CHAR(36)     NOT NULL,
      project_id      CHAR(36)     NOT NULL,
      target_kind     VARCHAR(20)  NOT NULL,
      target_id       CHAR(36)     NOT NULL,
      author_id       CHAR(36)     DEFAULT NULL,
      body            TEXT         NOT NULL,
      resolved        TINYINT(1)   NOT NULL DEFAULT 0,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_dms_target (target_kind, target_id),
      KEY idx_dms_project (project_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ dms_comments');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS dms_snapshots (
      id              CHAR(36)     NOT NULL,
      project_id      CHAR(36)     NOT NULL,
      user_id         CHAR(36)     DEFAULT NULL,
      label           VARCHAR(120) DEFAULT NULL,
      deliverables    JSON         NOT NULL,
      milestones      JSON         NOT NULL,
      deliverable_tasks JSON       DEFAULT NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_snap_project (project_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ dms_snapshots');
};
