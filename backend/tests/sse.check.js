// Chay: node tests/sse.check.js  -> "sse.check OK" la pass.
// Kiem tra SSE streamPending: gui pending luc connect + khi co event push.
const assert = require("assert");
const { connectRedis, redisClient } = require("../src/config/redis");
const service = require("../src/modules/qr_payment/qr_payment.service");
const controller = require("../src/modules/qr_payment/qr_payment.customer.controller");

const CID = 999999; // id gia, khong dung khach that
const REQ_KEY = (id) => `qr_payment_req_id:${id}`;
const PENDING_KEY = (cid) => `qr_payment_pending_cust:${cid}`;

(async () => {
  await connectRedis();

  // 1. Seed 1 yeu cau PENDING trong Redis (invoiceId null -> khong dung Postgres)
  const requestId = "test-req-1";
  const data = { requestId, customerId: CID, amount: 50000, tableId: 1, invoiceId: null, restaurantName: "Test", status: "PENDING", createdAt: Date.now() };
  await redisClient.set(REQ_KEY(requestId), JSON.stringify(data), { EX: 30 });
  await redisClient.set(PENDING_KEY(CID), requestId, { EX: 30 });

  // 2. Gia lap req/res cua Express
  const writes = [];
  let onClose;
  const res = { set() {}, flushHeaders() {}, write(s) { writes.push(s); }, end() {} };
  const req = { user: { id: CID }, on(ev, cb) { if (ev === "close") onClose = cb; } };

  // 3. Mo stream -> phai gui pending hien tai (connect-time)
  controller.streamPending(req, res);
  await new Promise((r) => setTimeout(r, 100));
  const sent = writes.join("");
  assert.ok(sent.includes("event: pending"), "phai gui event pending luc connect");
  assert.ok(sent.includes(requestId), "phai chua requestId");

  // 4. Yeu cau moi + emit -> phai push tiep (requestId khac)
  const req2 = "test-req-2";
  await redisClient.set(REQ_KEY(req2), JSON.stringify({ ...data, requestId: req2 }), { EX: 30 });
  await redisClient.set(PENDING_KEY(CID), req2, { EX: 30 });
  service.qrEvents.emit(`pending:${CID}`);
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(writes.join("").includes(req2), "phai push yeu cau moi qua event");

  // 5. Dong ket noi + don dep
  onClose && onClose();
  await redisClient.del(REQ_KEY(requestId));
  await redisClient.del(REQ_KEY(req2));
  await redisClient.del(PENDING_KEY(CID));
  await redisClient.quit();
  console.log("sse.check OK");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
