// routes/paginate.js — Helper de pagination
async function paginate(db, sql, params, page, limit) {
  const p = parseInt(page) || 1;
  const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const offset = (p - 1) * l;

  const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM (${sql})`).get(...params);
  const total = countRow ? countRow.total : 0;

  const data = await db.prepare(`${sql} LIMIT ? OFFSET ?`).all(...params, l, offset);

  return { data, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
}

module.exports = { paginate };
