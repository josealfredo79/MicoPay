import "./config.js";
import { config } from "./config.js";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { websocketPlugin } from "./plugins/websocket.js";
import { healthRoutes } from "./routes/health.js";
import { cashRoutes } from "./routes/cash.js";
import { reputationRoutes } from "./routes/reputation.js";
import { fundRoutes } from "./routes/fund.js";
import { serviceRoutes } from "./routes/services.js";
import { demoRoutes } from "./routes/demo.js";
import { cetesRoutes } from "./routes/cetes.js";
import { bazaarRoutes } from "./routes/bazaar.js";
import { merchantRoutes } from "./routes/merchants.js";
import { tradeRoutes } from "./routes/trades.js";
import { accountRoutes } from "./routes/account.js";
import { startRelayer, getRelayerStats } from "./services/relayer.js";
import { startRefundCron, getRefundCronStatus } from "./services/refund-cron.js";
import { initCashRequestsTable } from "./services/cash-requests.js";

console.log("=== MICOPAY API STARTUP ===");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "[SET]" : "[NOT SET]");
console.log("STELLAR_NETWORK:", process.env.STELLAR_NETWORK);
console.log("ESCROW_CONTRACT_ID:", process.env.ESCROW_CONTRACT_ID);
console.log("PLATFORM_SECRET_KEY:", process.env.PLATFORM_SECRET_KEY ? "[SET]" : "[NOT SET]");
console.log("MOCK_STELLAR:", process.env.MOCK_STELLAR);
console.log("=== CONFIG:", config);
const NODE_ENV = process.env.NODE_ENV ?? "development";

const app = Fastify({
  logger: NODE_ENV === "development",
  trustProxy: true,
});

app.register(fastifyCors, { origin: "*" });

registerRateLimit(app);
app.register(websocketPlugin);

app.register(healthRoutes);
app.register(cashRoutes);
app.register(reputationRoutes);
app.register(fundRoutes);
app.register(serviceRoutes);
app.register(demoRoutes);
app.register(cetesRoutes);
app.register(bazaarRoutes);
app.register(merchantRoutes);
app.register(tradeRoutes);
app.register(accountRoutes);

async function start() {
  try {
    await initCashRequestsTable();
    console.log("Database initialized: cash_requests table ready");
  } catch (err) {
    console.warn("Database initialization skipped (no DB configured):", err);
  }

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`MicoPay API running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  
  startRelayer();
  const stats = getRelayerStats();
  console.log(`Relayer started: ${stats.total} swaps tracked`);

  startRefundCron();
  const cronStatus = getRefundCronStatus();
  console.log(`Refund cron: ${cronStatus.running ? "running" : "disabled"}`);
}

start();
