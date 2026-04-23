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
console.log("PORT:", config.port);
console.log("NODE_ENV:", config.nodeEnv);
console.log("DATABASE_URL:", config.databaseUrl ? "[SET]" : "[NOT SET]");
console.log("STELLAR_NETWORK:", config.stellarNetwork);
console.log("ESCROW_CONTRACT_ID:", config.escrowContractId ? config.escrowContractId.slice(0, 8) + "..." : "NOT SET");
console.log("MOCK_STELLAR:", config.mockStellar);

const app = Fastify({
  logger: config.nodeEnv === "development",
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
  if (config.databaseUrl) {
    try {
      await initCashRequestsTable();
      console.log("Database initialized: cash_requests table ready");
    } catch (err) {
      console.warn("Database initialization failed:", err);
    }
  } else {
    console.warn("Database initialization skipped: DATABASE_URL not set");
  }

  try {
    await app.listen({ host: "0.0.0.0", port: config.port });
    console.log(`MicoPay API running on port ${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
  
  startRelayer();
  const stats = getRelayerStats();
  console.log(`Relayer started: ${stats.total} swaps tracked`);

  startRefundCron();
  const cronStatus = getRefundCronStatus();
  console.log(`Refund cron: ${cronStatus.running ? "running" : "disabled"}`);
}

start();
