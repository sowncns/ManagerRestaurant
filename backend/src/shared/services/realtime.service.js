
const EventEmitter = require("events");
const supabase = require("../../config/supabase");
const pool = require("../../config/db");
const logger = require("../utils/logger");

const TABLES = ["order_items", "reservations"];
const events = new EventEmitter();
events.setMaxListeners(0); // nhieu ket noi SSE cung luc
let channels = [];

async function branchOf(table, row) {
  if (!row) return null;
  if (table === "reservations") return row.branch_id ?? null;
 
  if (row.order_id == null) return null;
  try {
    const { rows } = await pool.query("SELECT branch_id FROM orders WHERE order_id = $1", [row.order_id]);
    return rows[0]?.branch_id ?? null;
  } catch {
    return null;
  }
}

function start() {
  if (!supabase) {
    logger.warn("Supabase chua cau hinh -> bo qua Realtime (van dung polling)");
    return;
  }
  for (const table of TABLES) {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, async (payload) => {
        const row = payload.new || payload.old;
        const branchId = await branchOf(table, row);
        if (branchId == null) return;
        events.emit(`${table}:${branchId}`, { type: payload.eventType, row });
      })
      .subscribe();
    channels.push(channel);
  }
  logger.info({ tables: TABLES }, "Supabase Realtime da subscribe");
}

function stop() {
  if (!supabase) return;
  for (const channel of channels) {
    supabase.removeChannel(channel);
  }
  channels = [];
}

// SSE: giu ket noi mo, forward thay doi cua `table` TRONG chi nhanh cua user xuong client.
// Client nhan event "change" ({ type, row }) roi tu refetch queue/alerts (da scope theo branch).
function stream(table, req, res) {
  const key = `${table}:${req.user.branch_id}`;
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // tat buffer neu chay sau nginx
  });
  res.flushHeaders?.();
  res.write("event: ready\ndata: {}\n\n"); // bao client da ket noi (trigger refetch lan dau)

  const onChange = (data) => res.write(`event: change\ndata: ${JSON.stringify(data)}\n\n`);
  events.on(key, onChange);

  const hb = setInterval(() => res.write(": ping\n\n"), 25000); // heartbeat giu ket noi

  req.on("close", () => {
    clearInterval(hb);
    events.off(key, onChange);
    res.end();
  });
}

module.exports = { start, stop, stream, events };
