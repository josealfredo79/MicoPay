import "./config.js";
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
import { startRelayer, getRelayerStats } from "./services/relayer.js";
import { startRefundCron, getRefundCronStatus } from "./services/refund-cron.js";
import { initCashRequestsTable } from "./services/cash-requests.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
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
