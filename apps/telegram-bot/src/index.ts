import { Bot, InlineKeyboard } from "grammy";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import axios from "axios";
import { interpretUserIntent, generateAIResponse } from "./chat-llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const envPath = join(projectRoot, ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.API_URL || "http://localhost:3000";
const MINI_APP_URL = process.env.MINI_APP_URL || "https://your-app.vercel.app/miniapp.html";

if (!TELEGRAM_BOT_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is required");
  console.log("Get it from @BotFather in Telegram");
  process.exit(1);
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

const userSessions = new Map<number, { state: string; amount_mxn?: number; amount_usdc?: string }>();

async function safeAnswer(ctx: any, text?: string) {
  try {
    await ctx.answerCallbackQuery({ text });
  } catch {
    // Query expired, ignore
  }
}

const STATES = {
  MAIN: "main",
  SELECT_AMOUNT: "select_amount",
  CONFIRM: "confirm",
};

function mainMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .row({ text: "Ver Tasas", callback_data: "rates" })
    .row({ text: "Ver Agentes", callback_data: "agents" })
    .row({ text: "Solicitar Efectivo", callback_data: "request_cash" })
    .row({ text: "Abrir Mini App", url: MINI_APP_URL })
    .row({ text: "Ayuda", callback_data: "help" });
}

function amountMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .row(
      { text: "$500 MXN", callback_data: "amount_500" },
      { text: "$1,000 MXN", callback_data: "amount_1000" }
    )
    .row(
      { text: "$2,000 MXN", callback_data: "amount_2000" },
      { text: "$5,000 MXN", callback_data: "amount_5000" }
    )
    .row({ text: "Volver", callback_data: "back_main" });
}

function confirmMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .row(
      { text: "Confirmar", callback_data: "confirm_yes" },
      { text: "Cancelar", callback_data: "confirm_no" }
    );
}

function agentsMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .row({ text: "Farmacia Guadalupe", callback_data: "agent_1" })
    .row({ text: "Tienda Don Pepe", callback_data: "agent_2" })
    .row({ text: "Papeleria Central", callback_data: "agent_3" })
    .row({ text: "Volver", callback_data: "back_main" });
}

bot.command("start", async (ctx) => {
  const msg = "Bienvenido a MicoPay!\n\n" +
    "Convierte tus USDC en efectivo MXN de forma rapida y segura.\n\n" +
    "Selecciona una opcion:";
  await ctx.reply(msg, { reply_markup: mainMenu() });
});

bot.command("help", async (ctx) => {
  const msg = "Como usar MicoPay\n\n" +
    "1. Usa /request para solicitar efectivo\n" +
    "2. Selecciona la cantidad MXN\n" +
    "3. Elige un agente cercano\n" +
    "4. Confirma y paga en USDC\n" +
    "5. Recibe tu efectivo!\n\n" +
    "Necesitas ayuda? Escribe tu pregunta";
  await ctx.reply(msg, { reply_markup: mainMenu() });
});

bot.command("request", async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) userSessions.set(userId, { state: STATES.SELECT_AMOUNT });
  const msg = "Solicitar Efectivo\n\nSelecciona la cantidad MXN que necesitas:";
  await ctx.reply(msg, { reply_markup: amountMenu() });
});

bot.command("rates", async (ctx) => {
  await ctx.reply("Cargando tasas...");
  try {
    const res = await axios.get(`${API_URL}/defi/cetes/rate`, { timeout: 5000 });
    const data = res.data;
    const rate = (data.cesPriceMxn * data.xlmPerUsdc).toFixed(2);
    const msg = "Tasas Actuales\n\n" +
      "1 USDC = $" + rate + " MXN\n" +
      "APY CETES: " + data.apy + "%\n" +
      "XLM/USDC: " + data.xlmPerUsdc + "\n\n" +
      "Actualizado: " + new Date().toLocaleString();
    await ctx.reply(msg, { reply_markup: mainMenu() });
  } catch {
    const msg = "Tasas (Simuladas)\n\n1 USDC = $17.50 MXN\n\nUsa /rates para actualizar";
    await ctx.reply(msg, { reply_markup: mainMenu() });
  }
});

bot.command("agents", async (ctx) => {
  const msg = "Agentes Disponibles\n\nSelecciona un agente para ver detalles:";
  await ctx.reply(msg, { reply_markup: agentsMenu() });
});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return;
  
  const userId = ctx.from?.id;
  const session = userId ? (userSessions.get(userId) || { state: STATES.MAIN }) : { state: STATES.MAIN };

  switch (data) {
    case "rates":
      await safeAnswer(ctx);
      await ctx.editMessageText("Cargando tasas...");
      try {
        const res = await axios.get(`${API_URL}/defi/cetes/rate`, { timeout: 5000 });
        const d = res.data;
        const rate = (d.cesPriceMxn * d.xlmPerUsdc).toFixed(2);
        const msg = "Tasas Actuales\n\n" +
          "1 USDC = $" + rate + " MXN\n" +
          "APY CETES: " + d.apy + "%\n\n" +
          "Actualizado: " + new Date().toLocaleString();
        await ctx.editMessageText(msg, { reply_markup: mainMenu() });
      } catch {
        await ctx.editMessageText("Tasas (Simuladas)\n\n1 USDC = $17.50 MXN", { reply_markup: mainMenu() });
      }
      break;

    case "agents":
      await safeAnswer(ctx);
      await ctx.editMessageText(
        "Agentes Disponibles\n\n" +
        "1. Farmacia Guadalupe [DISPONIBLE]\n" +
        "   Roma Norte, CDMX\n" +
        "   $5,000 MXN disponible\n\n" +
        "2. Tienda Don Pepe [DISPONIBLE]\n" +
        "   Condesa, CDMX\n" +
        "   $3,000 MXN disponible\n\n" +
        "3. Papeleria Central [NO DISPONIBLE]\n" +
        "   Del Valle, CDMX\n" +
        "   $2,000 MXN disponible", {
        reply_markup: agentsMenu(),
      });
      break;

    case "request_cash":
      await safeAnswer(ctx);
      if (userId) userSessions.set(userId, { state: STATES.SELECT_AMOUNT });
      await ctx.editMessageText("Solicitar Efectivo\n\nSelecciona la cantidad MXN:", { reply_markup: amountMenu() });
      break;

    case "back_main":
      await safeAnswer(ctx);
      if (userId) userSessions.delete(userId);
      await ctx.editMessageText("Bienvenido a MicoPay!\n\nSelecciona una opcion:", { reply_markup: mainMenu() });
      break;

    case "amount_500":
    case "amount_1000":
    case "amount_2000":
    case "amount_5000":
      await safeAnswer(ctx);
      const amount = parseInt(data.split("_")[1]);
      const usdc = (amount / 17.5).toFixed(2);
      if (userId) {
        userSessions.set(userId, { state: STATES.CONFIRM, amount_mxn: amount, amount_usdc: usdc });
      }
      await ctx.editMessageText(
        "Confirmar Solicitud\n\n" +
        "Cantidad: $" + amount + " MXN\n" +
        "Equivalente: " + usdc + " USDC\n" +
        "Comision: 0% (demo)\n\n" +
        "Confirmas la operacion?", {
        reply_markup: confirmMenu(),
      });
      break;

    case "confirm_yes":
      await safeAnswer(ctx, "Operacion confirmada!");
      if (userId) userSessions.delete(userId);
      await ctx.editMessageText(
        "Solicitud Confirmada!\n\n" +
        "ID: MCO-" + Date.now().toString().slice(-8) + "\n" +
        "Monto: $" + session.amount_mxn + " MXN\n" +
        "USDC: " + session.amount_usdc + "\n\n" +
        "Farmacia Guadalupe\n" +
        "Roma Norte, CDMX\n\n" +
        "Tiempo estimado: 5 minutos\n\n" +
        "Presenta este codigo al agent para recibir tu efectivo", {
        reply_markup: mainMenu(),
      });
      break;

    case "confirm_no":
      await safeAnswer(ctx, "Operacion cancelada");
      if (userId) userSessions.delete(userId);
      await ctx.editMessageText(
        "Operacion Cancelada\n\n" +
        "Puedes iniciar una nueva solicitud cuando lo desees.\n\n" +
        "Selecciona una opcion:", {
        reply_markup: mainMenu(),
      });
      break;

    case "agent_1":
    case "agent_2":
    case "agent_3":
      await safeAnswer(ctx);
      const agentNames: Record<string, string> = {
        agent_1: "Farmacia Guadalupe",
        agent_2: "Tienda Don Pepe",
        agent_3: "Papeleria Central",
      };
      await ctx.editMessageText(
        agentNames[data] + "\n\n" +
        "Ubicacion: Roma Norte, CDMX\n" +
        "Distancia: 0.5 km\n" +
        "Disponible: $5,000 MXN\n" +
        "Reputacion: 98%\n" +
        "Tier: Maestro\n\n" +
        "Para solicitar efectivo, usa /request", {
        reply_markup: agentsMenu(),
      });
      break;

    case "help":
      await safeAnswer(ctx);
      await ctx.editMessageText(
        "Ayuda\n\n" +
        "Comandos disponibles:\n" +
        "/start - Inicio\n" +
        "/rates - Ver tasas\n" +
        "/agents - Ver agentes\n" +
        "/request - Solicitar efectivo\n\n" +
        "O usa los botones de abajo!", {
        reply_markup: mainMenu(),
      });
      break;
  }
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  
  if (text.startsWith("/")) {
    return;
  }

  await ctx.reply("Pensando...");

  try {
    const intent = await interpretUserIntent(text);
    
    switch (intent.action) {
      case "rates":
        await ctx.reply("Consultando tasas...");
        try {
          const res = await axios.get(`${API_URL}/defi/cetes/rate`, { timeout: 5000 });
          const d = res.data;
          const rate = (d.cesPriceMxn * d.xlmPerUsdc).toFixed(2);
          await ctx.reply(
            "Tasas Actuales\n\n" +
            "1 USDC = $" + rate + " MXN\n" +
            "APY CETES: " + d.apy + "%\n" +
            "XLM/USDC: " + d.xlmPerUsdc + "\n\n" +
            "Usa /request para solicitar efectivo", {
            reply_markup: mainMenu(),
          });
        } catch {
          await ctx.reply("1 USDC = $17.50 MXN (simulado)", { reply_markup: mainMenu() });
        }
        break;

      case "agents":
        await ctx.reply(
          "Agentes Disponibles\n\n" +
          "1. Farmacia Guadalupe [DISPONIBLE]\n" +
          "   Roma Norte, CDMX\n" +
          "   $5,000 MXN disponible\n\n" +
          "2. Tienda Don Pepe [DISPONIBLE]\n" +
          "   Condesa, CDMX\n" +
          "   $3,000 MXN disponible\n\n" +
          "Usa /request para solicitar efectivo", {
          reply_markup: agentsMenu(),
        });
        break;

      case "request":
        const userId = ctx.from?.id;
        if (intent.amount) {
          if (userId) {
            const usdc = (intent.amount / 17.5).toFixed(2);
            userSessions.set(userId, { state: STATES.CONFIRM, amount_mxn: intent.amount, amount_usdc: usdc });
          }
          await ctx.reply(
            "Solicitar Efectivo\n\n" +
            "Cantidad: $" + intent.amount + " MXN\n" +
            "Equivalente: " + (intent.amount / 17.5).toFixed(2) + " USDC\n\n" +
            "Confirmas la operacion?", {
            reply_markup: confirmMenu(),
          });
        } else {
          if (userId) userSessions.set(userId, { state: STATES.SELECT_AMOUNT });
          await ctx.reply(
            "Solicitar Efectivo\n\nSelecciona la cantidad MXN que necesitas:", {
            reply_markup: amountMenu(),
          });
        }
        break;

      case "help":
        await ctx.reply(
          "Ayuda\n\n" +
          "Puedo ayudarte a:\n" +
          "- Ver tasas de cambio\n" +
          "- Solicitar efectivo MXN\n" +
          "- Ver agentes cercanos\n\n" +
          "Comandos: /rates /agents /request /help", {
          reply_markup: mainMenu(),
        });
        break;

      case "general":
      default:
        const aiResponse = await generateAIResponse(text);
        await ctx.reply(aiResponse + "\n\n" + "O usa los botones:", { reply_markup: mainMenu() });
        break;
    }
  } catch {
    const fallback = await generateAIResponse(text);
    await ctx.reply(fallback + "\n\n" + "Usa /help para ver comandos disponibles:", { reply_markup: mainMenu() });
  }
});

const app = express();
app.use(express.static(__dirname));

app.get("/miniapp.html", (req: express.Request, res: express.Response) => {
  res.sendFile(join(__dirname, "miniapp.html"));
});

app.get("/", (req: express.Request, res: express.Response) => {
  const html = "<!DOCTYPE html><html><head><title>MicoPay Bot</title>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
    "<style>body{font-family:sans-serif;background:#17212b;color:white;padding:20px;text-align:center}" +
    "h1{color:#2ed573}p{color:#8795a1}</style></head><body>" +
    "<h1>MicoPay Bot</h1><p>Convierte USDC a MXN en segundos</p>" +
    "<p>Abre este link desde Telegram para usar el bot</p></body></html>";
  res.send(html);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Mini App server running on port " + PORT);
});

console.log("Starting MicoPay Bot...");

bot.catch((err) => {
  console.log("Error en bot:", err.message);
});

bot.start();
console.log("Bot started! Mini App: http://localhost:" + PORT + "/miniapp.html");
