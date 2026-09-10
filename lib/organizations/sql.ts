export const INSERT_ORGANIZATION = `INSERT OR IGNORE INTO organization_watchlist (user_id,id,name,url,reason,notes,next_step,status,archived,version) VALUES (?,?,?,?,?,?,?,?,?,1)`;
export const UPDATE_ORGANIZATION = `UPDATE organization_watchlist SET name=?,url=?,reason=?,notes=?,next_step=?,status=?,archived=?,version=version+1 WHERE user_id=? AND id=? AND version=?`;
