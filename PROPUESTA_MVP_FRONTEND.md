# Propuesta: Interfaz MVP para Retiros

**Fecha:** 2026-04-16
**Proyecto:** MicoPay Protocol

---

## Estado Actual

El proyecto tiene **dos frontends**:
- `micopay/frontend` → Conecta a `micopay/backend` (viejo)
- `apps/web` → No existe aún

---

## Propuesta: Crear interfaz MVP en `apps/web`

### Estructura de archivos

```
apps/web/
├── src/
│   ├── pages/
│   │   ├── Home.tsx              # Dashboard con balance
│   │   ├── CashoutFlow/
│   │   │   ├── EnterAmount.tsx   # Paso 1: Ingresar monto
│   │   │   ├── SelectAgent.tsx   # Paso 2: Mapa + lista merchants
│   │   │   └── ClaimQR.tsx       # Paso 3: QR para cobrar
│   │   └── TransactionStatus.tsx  # Verificar estado
│   ├── components/
│   │   ├── MerchantCard.tsx
│   │   ├── MapView.tsx           # Integración mapa
│   │   └── BalanceDisplay.tsx
│   ├── services/
│   │   └── micopay-api.ts        # Cliente para API
│   └── hooks/
│       └── useCashRequest.ts
```

### Conexión con API

```typescript
// GET /api/v1/cash/agents?lat=19.4&lng=-99.1&amount=500
// → Lista de merchants cercanos

// POST /api/v1/cash/request
// → Crea request, devuelve QR payload

// GET /api/v1/cash/request/:id
// → Consulta estado
```

### Funcionalidades MVP

| Feature | Descripción |
|---------|-------------|
| **1. Balance** | Mostrar saldo USDC del usuario |
| **2. Ingresar monto** | Input para MXN a retirar |
| **3. Mapa interactivo** | Leaflet/OpenStreetMap con merchants |
| **4. Lista merchants** | Cards con distancia, tasa, reputación |
| **5. Solicitar retiro** | Llamar API, mostrar QR |
| **6. Estado** | Polling del estado de la transacción |

### Dependencias a agregar

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@tanstack/react-query": "^5.0.0"
}
```

### Tiempo estimado

- **Interfaz básica**: 2-3 horas
- **Integración mapa**: 1-2 horas  
- **Tests**: 1 hora

**Total: ~5 horas**

---

## Mejoras implementadas (2026-04-16)

| # | Mejora | Estado |
|---|--------|--------|
| 1 | Validación de config con Zod | ✅ |
| 2 | Eliminar fallback demo en escrow | ✅ |
| 3 | Tests con mocks | ✅ |
| 4 | ESLint + TypeScript strict | ✅ |
| 5 | Persistencia PostgreSQL | ✅ |
| 6 | CI/CD con GitHub Actions | ✅ |

**Tests: 127 passing** | **Lint: 0 errors, 102 warnings**
