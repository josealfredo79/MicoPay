import fastifyRateLimit from "@fastify/rate-limit";

export async function registerRateLimit(app: any) {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
}
