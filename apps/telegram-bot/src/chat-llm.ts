import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Eres el asistente de MicoPay, un servicio que permite convertir USDC a efectivo MXN en Mexico.

Funcionalidades principales:
- Ver tasas de cambio USDC/MXN
- Solicitar efectivo en agentes cercanos (farmacias, tiendas)
- Ver agentes disponibles con su ubicacion y reputacion
- Proceso: seleccionar cantidad -> elegir agente -> confirmar -> recibir codigo QR

Respuestas cortas y amigables en espanol. Usa emojis solo cuando sea util.

Comandos disponibles en el bot:
- /start - Menu principal
- /rates - Ver tasas actuales
- /agents - Ver agentes cercanos
- /request - Solicitar efectivo
- /help - Ayuda

Cuando el usuario pida algo relacionado con efectivo, cambios, o convierta USDC a pesos, guialo al comando /request.`;

export interface ChatIntent {
  action: "rates" | "agents" | "request" | "help" | "general" | "unknown";
  amount?: number;
  details?: string;
}

export async function interpretUserIntent(userMessage: string): Promise<ChatIntent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return interpretSimple(userMessage);
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analiza este mensaje del usuario y determina su intencion. Responde SOLO con JSON valido:\n\nMensaje: "${userMessage}"\n\nResponde con:\n- action: "rates" si quiere ver tasas, "agents" si quiere ver agentes, "request" si quiere solicitar efectivo, "help" si pide ayuda, "general" para otra pregunta\n- amount: numero si menciona una cantidad de MXN o USDC\n- details: descripcion breve\n\nEjemplo: {"action": "request", "amount": 1000, "details": "Quiere cambiar 1000 pesos"}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    return parsed;
  } catch {
    return interpretSimple(userMessage);
  }
}

function interpretSimple(message: string): ChatIntent {
  const lower = message.toLowerCase();
  
  if (lower.includes("tasa") || lower.includes("rate") || lower.includes("cambio") || lower.includes("precio")) {
    return { action: "rates", details: "Consulta de tasas" };
  }
  if (lower.includes("agente") || lower.includes("cercano") || lower.includes("ubicacion")) {
    return { action: "agents", details: "Consulta de agentes" };
  }
  if (lower.includes("solicitar") || lower.includes("efectivo") || lower.includes("cambiar") || lower.includes("pesos") || lower.includes("mxn")) {
    return { action: "request", details: "Solicitud de efectivo" };
  }
  if (lower.includes("ayuda") || lower.includes("help")) {
    return { action: "help", details: "Pide ayuda" };
  }
  
  return { action: "general", details: "Consulta general" };
}

export async function generateAIResponse(userMessage: string, context?: { rates?: string; agents?: string }): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateSimpleResponse(userMessage);
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch {
    return generateSimpleResponse(userMessage);
  }
}

function generateSimpleResponse(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes("hola") || lower.includes("hi")) {
    return "Hola! Soy tu asistente de MicoPay. Puedo ayudarte a convertir USDC a efectivo MXN. Usa /request para comenzar o /help para ver todos los comandos.";
  }
  
  if (lower.includes("gracias")) {
    return "De nada! Si necesitas algo mas, aqui estoy. Puedes usar /request cuando quieras cambiar USDC a efectivo.";
  }
  
  return "Entiendo tu mensaje. Para solicitudes de efectivo usa /request, para ver tasas usa /rates, o para ayuda usa /help.";
}
