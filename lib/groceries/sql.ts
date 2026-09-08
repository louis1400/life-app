export const APPEND_EVENT_SQL=`INSERT INTO grocery_events (id,user_id,product_id,action_json,occurred_on,recorded_at)
SELECT ?,?,?,?,?,?
WHERE COALESCE((SELECT MAX(seq) FROM grocery_events WHERE user_id=? AND product_id=?),0)=?
ON CONFLICT(id) DO NOTHING`;
