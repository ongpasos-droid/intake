/**
 * Vectorize all KA3 Youth Together documents
 * Usage: node scripts/vectorize-ka3-docs.js
 */
require('dotenv').config();
const db = require('../node/src/utils/db');
const { processDocument } = require('../node/src/services/vectorize');

const PROGRAM_ID = '00000000-0000-4000-a000-000000000001';

async function run() {
  console.log('Loading KA3 documents...');
  const [docs] = await db.execute(
    `SELECT d.id, d.title, d.storage_path, d.file_type
     FROM documents d
     JOIN document_programs dp ON dp.document_id = d.id
     WHERE dp.program_id = ? AND d.status = 'active'
     ORDER BY d.id`,
    [PROGRAM_ID]
  );

  console.log(`Found ${docs.length} documents to vectorize.\n`);

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`[${i + 1}/${docs.length}] ${doc.title} (${doc.file_type})`);

    // Map file extension to mime type
    const mimeMap = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rtf: 'text/rtf',
      txt: 'text/plain',
    };
    const mime = mimeMap[doc.file_type] || 'text/plain';

    try {
      await processDocument(doc.id, { storage_path: doc.storage_path, file_type: mime });
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  // Summary
  const [chunks] = await db.execute(
    `SELECT COUNT(*) as total FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     JOIN document_programs dp ON dp.document_id = d.id
     WHERE dp.program_id = ?`,
    [PROGRAM_ID]
  );
  console.log(`\n✓ Vectorization complete. Total chunks: ${chunks[0].total}`);

  await db.end();
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
