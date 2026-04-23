import { config } from "../config.js";
import { query } from "../db/schema.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  components: {
    database: ComponentHealth;
    stellarRpc: ComponentHealth;
    contracts: ContractsHealth;
  };
}

export interface ComponentHealth {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

export interface ContractsHealth {
  status: "up" | "down" | "partial";
  deployed: {
    escrow: ContractStatus;
    mxne: ContractStatus;
  };
}

export interface ContractStatus {
  deployed: boolean;
  error?: string;
}

async function measureLatency(fn: () => Promise<void>): Promise<{ latencyMs: number }> {
  const start = performance.now();
  await fn();
  const latencyMs = Math.round(performance.now() - start);
  return { latencyMs };
}

async function checkDatabase(): Promise<ComponentHealth> {
  if (!config.databaseUrl) {
    return { status: "down", error: "Database not configured" };
  }
  try {
    const { latencyMs } = await measureLatency(async () => {
      const result = await query("SELECT 1 as health");
      if (result.rows[0]?.health !== 1) {
        throw new Error("Invalid health check response");
      }
    });
    console.log("[Health] Database: up");
    return { status: "up", latencyMs };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Health] Database: down -", errorMsg);
    return {
      status: "down",
      error: errorMsg,
    };
  }
}

async function checkStellarRpc(): Promise<ComponentHealth> {
  try {
    const { latencyMs } = await measureLatency(async () => {
      const response = await fetch(config.stellarRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { jsonrpc?: string };
      if (data.jsonrpc !== "2.0") {
        throw new Error("Invalid RPC response");
      }
    });
    console.log("[Health] Stellar RPC: up");
    return { status: "up", latencyMs };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Health] Stellar RPC: down -", errorMsg);
    return {
      status: "down",
      error: errorMsg,
    };
  }
}

async function checkContractDeployed(contractId: string): Promise<ContractStatus> {
  if (!contractId) {
    return { deployed: false, error: "Contract ID not configured" };
  }

  try {
    const response = await fetch(config.stellarRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getContractData",
        params: [contractId, "last"],
      }),
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        return { deployed: false, error: "Contract not found on network" };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { result?: unknown; error?: { message?: string } };
    if (data.error?.message || !data.result) {
      return { deployed: false, error: "Contract not found on network" };
    }

    return { deployed: true };
  } catch (err) {
    return {
      deployed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkContracts(): Promise<ContractsHealth> {
  const [escrowStatus, mxneStatus] = await Promise.all([
    checkContractDeployed(config.escrowContractId),
    checkContractDeployed(config.mxneContractId),
  ]);

  const allDeployed = escrowStatus.deployed && mxneStatus.deployed;
  const anyDeployed = escrowStatus.deployed || mxneStatus.deployed;

  return {
    status: allDeployed ? "up" : anyDeployed ? "partial" : "down",
    deployed: {
      escrow: escrowStatus,
      mxne: mxneStatus,
    },
  };
}

export async function checkHealth(): Promise<HealthStatus> {
  const [database, stellarRpc, contracts] = await Promise.all([
    checkDatabase(),
    checkStellarRpc(),
    checkContracts(),
  ]);

  const allUp =
    database.status === "up" &&
    stellarRpc.status === "up" &&
    contracts.status === "up";

  const anyDown =
    database.status === "down" ||
    stellarRpc.status === "down" ||
    contracts.status === "down";

  const status: HealthStatus["status"] = allUp
    ? "healthy"
    : anyDown
    ? "unhealthy"
    : "degraded";

  return {
    status,
    timestamp: new Date().toISOString(),
    components: {
      database,
      stellarRpc,
      contracts,
    },
  };
}

export default { checkHealth };
