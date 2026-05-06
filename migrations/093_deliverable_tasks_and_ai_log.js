/**
 * Migration 093: traceability D ↔ tasks + AI generation audit log
 *
 * Two new tables introduced by the holistic D+MS generator (v2):
 *
 *   deliverable_tasks
 *     Many-to-many between deliverables and wp_tasks. Lets each deliverable
 *     declare which task(s) it covers, so the proposal narrative can write
 *     "D2.2 covers T2.3 + T2.4" and an EACEA evaluator can trace the chain
 *     task → deliverable → milestone end-to-end.
 *
 *   ai_generations
 *     Audit log of every AI-driven generation (input prompt, raw output,
 *     validator verdict, duration). Lets us debug surprising outputs without
 *     guessing what the AI saw.
 *
 * Both idempotent via CREATE TABLE IF NOT EXISTS.
 */
'use strict';

module.exports = async function (conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS deliverable_tasks (
      deliverable_id  CHAR(36) NOT NULL,
      task_id         CHAR(36) NOT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (deliverable_id, task_id),
      KEY idx_dt_task (task_id),
      CONSTRAINT fk_dt_deliverable FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE CASCADE,
      CONSTRAINT fk_dt_task        FOREIGN KEY (task_id)        REFERENCES wp_tasks(id)     ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ deliverable_tasks');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ai_generations (
      id              CHAR(36)     NOT NULL,
      project_id      CHAR(36)     NOT NULL,
      user_id         CHAR(36)     DEFAULT NULL,
      kind            VARCHAR(60)  NOT NULL,
      pass            VARCHAR(40)  DEFAULT NULL,
      system_prompt   MEDIUMTEXT   DEFAULT NULL,
      user_prompt     MEDIUMTEXT   DEFAULT NULL,
      raw_response    MEDIUMTEXT   DEFAULT NULL,
      parsed_json     JSON         DEFAULT NULL,
      validator_log   JSON         DEFAULT NULL,
      status          VARCHAR(20)  NOT NULL DEFAULT 'success',
      duration_ms     INT          DEFAULT NULL,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_aig_project (project_id),
      KEY idx_aig_kind    (kind, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  ✓ ai_generations');
};
