export const INSERT_TASK_SQL = `INSERT OR IGNORE INTO todo_tasks
  (user_id, id, title, notes, done, deleted, version, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`;
export const UPDATE_TASK_SQL = `UPDATE todo_tasks SET title=?, notes=?, done=?, deleted=?, version=version+1, updated_at=?
  WHERE user_id=? AND id=? AND version=?`;
