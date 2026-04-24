# Análisis de Despliegue en Railway - MicoPay

## Proyectos en el Repo

| Directorio | Descripción | Servicio en Railway |
|------------|-------------|-------------------|
| `apps/api/` | API nuevo con Turbo (x402, cash requests) | micopay-api (corriendo como micopay) |
| `micopay/backend/` | Backend viejo | micopay-backend |
| `apps/web/` | Frontend React nuevo | micopay (frontend) |

## URLs Actuales en Railway

```
micopay-production.up.railway.app           → apps/api (el nuevo)
micopay-backend-production.up.railway.app    → micopay/backend
```

## Errores Diagnosticados

### Error 1: 401 Unauthorized
**URL:** `micopay-backend-production.up.railway.app/api/v1/trades/history`
**Causa:** Falta `JWT_SECRET` configurado en Railway para micopay-backend

**Solución:**
Agregar en Railway Dashboard > micopay-backend > Variables:
```
JWT_SECRET=micopay-production-secret-key-2024-secure
```

### Error 2: 500 Internal Server Error
**URL:** `micopay-production.up.railway.app/api/v1/cash/request/...`
**Causa:** Una de dos:
1. No hay DATABASE_URL configurado (no puede hacer query a cash_requests)
2. El lockEscrow() falla al intentar bloquear USDC en el contrato Stellar

**Solución 1 - DATABASE_URL:**
Agregar en Railway Dashboard > micopay-api > Variables:
```
DATABASE_URL=postgresql://neondb_owner:npg_AGvFow1M6zxa@ep-wandering-recipe-anstrv0h-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
```

**Solución 2 - lockEscrow:**
El error viene de que el contrato Stellar no tiene fondos o las variables no apuntan al contrato correcto.
Revisar que ESCROW_CONTRACT_ID sea correcto.

---

## Variables por Servicio

### micopay-backend (micopay/backend/)

```
PORT=3002
NODE_ENV=production
JWT_SECRET=micopay-production-secret-key-2024-secure
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK=TESTNET
ESCROW_CONTRACT_ID=CB4M5777YFQWKGDUULCX5W6PXEDJSJARDTMH4VV6FXC4W4UPANALO3HZ
PLATFORM_SECRET_KEY=SCBHAHO2OHS45VWLER624UOWEIFQH4ROFEX3RDF5PFTN4O526WVPIONY
DATABASE_URL=postgresql://neondb_owner:npg_AGvFow1M6zxa@ep-wandering-recipe-anstrv0h-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
```

### micopay-api (apps/api/)

```
PORT=8080
NODE_ENV=production
JWT_SECRET=micopay-production-secret-key-2024-secure
PLATFORM_STELLAR_ADDRESS=GAE2SI3SNW6KAZ43GMPTJ5WRFVQYGJCU7R7TUYF4BO55F6WS7XXCZNJL
PLATFORM_SECRET_KEY=SCBHAHO2OHS45VWLER624UOWEIFQH4ROFEX3RDF5PFTN4O526WVPIONY
ESCROW_CONTRACT_ID=CCFV74IRTIXN32JCQR3SWZP63NEIIHMQPLJQTK5SB5WIMFGMZMXVNFOX
DATABASE_URL=postgresql://neondb_owner:npg_AGvFow1M6zxa@ep-wandering-recipe-anstrv0h-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
STELLAR_NETWORK=TESTNET
MOCK_STELLAR=false
SECRET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
```

---

## Tablas de Base de Datos Requeridas

Para que el API funcione correctamente, debe haber estas tablas en la DB:

```sql
-- cash_requests (creada automáticamente por initCashRequestsTable())
CREATE TABLE cash_requests (
  request_id VARCHAR(20) PRIMARY KEY,
  merchant_address VARCHAR(56) NOT NULL,
  merchant_name VARCHAR(100),
  amount_mxn DECIMAL(12,2) NOT NULL,
  amount_usdc VARCHAR(20),
  htlc_secret VARCHAR(64),
  htlc_secret_hash VARCHAR(64),
  htlc_tx_hash VARCHAR(64),
  status VARCHAR(20) DEFAULT 'pending',
  payer_address VARCHAR(56),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

---

## Nota Importante

El código en apps/api/src/index.ts tiene:
```typescript
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
```

Esto significa que si DATABASE_URL no está configurado, la tabla NO se crea y el API falla con 500.

---

## Checklist para Solucionar

- [ ] Agregar JWT_SECRET a micopay-backend
- [ ] Agregar DATABASE_URL a micopay-api (services)
- [ ] Verificar que la base de datos Neon tenga las tablas requeridas
- [ ] Verificar que el contrato Stellar tenga fondos para lockEscrow()