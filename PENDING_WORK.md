# MicoPay Protocol - Estado para Continuar

## Ultimo commit
```
fdda5b7 Initial commit: MicoPay Protocol - AI agents access to physical cash in Mexico
```

## Backup Git
- `/tmp/micopay-backup.bundle` - repositorio completo con historial
- `/tmp/micopay-commits.txt` - lista de commits originales

## Servicios Corriendo
- API: http://localhost:3000
- Telegram Bot: https://t.me/MicoPayBot

## Archivos Clave
- `apps/telegram-bot/` - Bot con Claude LLM integrado
- `apps/api/` - API del protocolo
- `apps/web/` - Dashboard web
- `contracts/` - Contratos Soroban (Rust)

## Pendiente

### 1. Separar .env por app
- `apps/api/.env` (variables de API)
- `apps/telegram-bot/.env` (variables del bot)

### 2. Contrato Soroban
- Desplegar `MicopayEscrow` en testnet
- Configurar `ESCROW_CONTRACT_ID` en API

### 3. Wallet Stellar
- Generar keys para el agente/demo
- Configurar `PLATFORM_SECRET_KEY` y `PLATFORM_STELLAR_ADDRESS`

### 4. Mejorar Bot Telegram
- El bot funciona pero "mas o menos"
- Posibles mejoras en el manejo de callbacks
- Integrar mejor con la API

## Comandos para Continuar

```bash
# Iniciar API
cd apps/api && npm run dev

# Iniciar Bot
cd apps/telegram-bot && npx tsx src/index.ts
```

## APIs Disponibles
- GET /health - Estado del sistema
- GET /defi/cetes/rate - Tasas CETES
- POST /api/v1/cash/request - Solicitar efectivo
- GET /api/v1/cash/agents - Agentes disponibles
