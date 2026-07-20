// E2E qua HTTP: mo phong 2 app. Khach mo SSE, nhan vien gui /request -> stream phai nhan pending.
// Chay khi server DANG chay o localhost:5000.  node tests/sse.e2e.js
const http = require("http");
const { signAccessToken } = require("../src/shared/utils/jwt");
const { connectRedis, redisClient } = require("../src/config/redis");

const CUSTOMER_ID = 39;
const custToken = signAccessToken({ id: CUSTOMER_ID, type: "customer" });
const staffToken = signAccessToken({ id: 1, type: "staff", role: "CASHIER", branch_id: 17, company_id: 4 });

function post(path, cookie, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: "localhost", port: 5000, path, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), Cookie: cookie } },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, body: b })); }
    );
    req.on("error", reject); req.write(data); req.end();
  });
}

(async () => {
  // 1. KHACH: mo SSE
  const chunks = [];
  const sse = http.get(
    { host: "localhost", port: 5000, path: "/api/customer/qr-payment/stream",
      headers: { Cookie: `customerAccessToken=${custToken}`, Accept: "text/event-stream" } },
    (res) => {
      console.log("SSE status:", res.statusCode);
      res.on("data", (c) => chunks.push(c.toString()));
    }
  );
  sse.on("error", (e) => console.error("SSE err", e.message));

  await new Promise((r) => setTimeout(r, 800)); // cho ket noi

  // 2. NHAN VIEN: gui yeu cau thanh toan cho khach 39
  const r = await post("/api/internal/qr-payment/request", `internalAccessToken=${staffToken}`,
    { customerId: CUSTOMER_ID, amount: 50000, tableId: 1 });
  console.log("Staff /request ->", r.status, r.body);

  // 3. Cho SSE nhan push
  await new Promise((r) => setTimeout(r, 1000));
  sse.destroy();

  const stream = chunks.join("");
  const ok = stream.includes("event: pending") && stream.includes("50000");
  console.log("--- SSE nhan duoc ---\n" + (stream || "(rong)"));
  console.log(ok ? "\n✅ PUSH HOAT DONG: app khach nhan yeu cau ngay khi nhan vien gui" : "\n❌ Khong nhan duoc push");

  // 4. Don dep pending cua khach 39
  await connectRedis();
  await redisClient.del(`qr_payment_pending_cust:${CUSTOMER_ID}`);
  await redisClient.quit();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
