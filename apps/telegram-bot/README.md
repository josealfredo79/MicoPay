# MicoPay Telegram Bot

## Setup Instructions

### 1. Create your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts:
   - Bot name: `MicoPay`
   - Bot username: `micopaybot` (or your choice)
4. Copy the **Bot Token** (starts with `123456789:`)

### 2. Configure Environment

Create a `.env` file:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
API_URL=http://localhost:3000
MINI_APP_URL=https://your-domain.com/miniapp.html
PORT=3001

# Optional: Enable AI-powered natural language (falls back to keywords if not set)
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the Bot

```bash
cd apps/telegram-bot
npm install
npm run dev
```

### 4. Test Your Bot

1. Open Telegram and search for your bot by username
2. Click **Start**
3. Try the buttons!

## Bot Features

### Commands
- `/start` - Welcome message
- `/help` - Help menu
- `/rates` - Current USDC/MXN rate
- `/agents` - List of nearby agents
- `/request` - Request cash exchange

### Conversational (Natural Language)
The bot understands natural language queries:
- "hola" / "hi" / "buenos dias"
- "quiero cambiar USDC a pesos"
- "cual es la tasa?"
- "necesito 1000 pesos"
- "dame la lista de agentes"
- "como funciona?"

#### With LLM (Claude) - Optional
If `ANTHROPIC_API_KEY` is set, the bot uses Claude for advanced understanding:
- Understands complex sentences
- Extracts amounts from natural language ("quiero cambiar unos 500 dolares")
- Provides contextual responses
- Falls back to simple keyword matching if API key not available

### Inline Buttons
- View rates (live from API)
- View agents (with details)
- Request cash (step-by-step flow)
- Open Mini App

## Mini App

The Mini App provides a visual interface inside Telegram:

1. Click "Abrir Mini App" in the bot
2. Select amount
3. Confirm payment
4. Get confirmation code

### Deploying Mini App

For production, deploy the `miniapp.html` to:
- Vercel
- Netlify
- GitHub Pages

Update `MINI_APP_URL` in `.env`

## Bot Architecture

```
Telegram Bot (grammy)
    ├── Commands: /start, /help, /rates, /agents, /request
    ├── Callback Queries (inline buttons)
    ├── Conversational Text
    └── Mini App (webview)

Mini App (HTML/JS)
    ├── Telegram WebApp SDK
    ├── Rate Display (live)
    ├── Amount Selector
    └── Payment Confirmation
```

## Screenshots

### Bot Main Menu
```
👋 Bienvenido a MicoPay!

[💱 Ver Tasas] [👥 Ver Agentes]
[💰 Solicitar] [📱 Mini App]
```

### Cash Request Flow
```
💰 Selecciona la cantidad MXN:

[$500 MXN]  [$1,000 MXN]
[$2,000 MXN] [$5,000 MXN]

✅ Confirmar | ❌ Cancelar
```

### Mini App
- Modern dark theme
- Touch-friendly buttons
- Haptic feedback
- Live rates
