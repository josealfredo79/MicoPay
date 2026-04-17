# Propuesta: Interfaz MVP para Retiros

**Fecha:** 2026-04-16
**Última actualización:** 2026-04-17
**Proyecto:** MicoPay Protocol

---

## Estado Actual

El proyecto tiene **dos frontends**:
- `micopay/frontend` → Conecta a `micopay/backend` (viejo)
- `apps/web` → Interfaz principal (production-ready)

---

## Estructura de archivos

```
apps/web/src/
├── App.tsx                      # Router principal
├── main.tsx                     # Entry point
├── pages/
│   └── mobile/                  # Páginas mobile
│       ├── Home.tsx             # Dashboard con balance
│       ├── DepositRequest.tsx   # Ingresar monto depósito
│       ├── DepositMap.tsx       # Mapa + lista merchants
│       ├── DepositQR.tsx        # QR para cobrar
│       ├── DepositChat.tsx       # Chat con agente
│       ├── CashoutRequest.tsx   # Solicitar retiro
│       ├── TransactionStatus.tsx # Polling de estado
│       └── ...
├── components/
│   ├── ui/                      # Componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   └── index.ts
│   ├── domain/                  # Componentes de negocio
│   │   ├── MerchantCard.tsx     # Card de agente
│   │   ├── MapView.tsx         # Mapa Leaflet real
│   │   ├── BalanceDisplay.tsx   # Saldo con estilos
│   │   └── index.ts
│   ├── layout/                  # Layout
│   │   ├── Logo.tsx
│   │   └── BottomNav.tsx
│   └── demo/                    # Demo legacy
│       ├── DemoTerminal.tsx
│       └── ...
├── services/
│   ├── api.ts                   # Cliente API
│   └── index.ts
├── hooks/
│   ├── useAgents.ts            # Hook para agentes
│   ├── useCashRequest.ts       # Hook para solicitudes
│   └── index.ts
└── types/
    └── index.ts                # TypeScript types
```

### Conexión con API

```typescript
// GET /api/v1/cash/agents?lat=19.4&lng=-99.1&amount=500
// → Lista de agents cercanos

// POST /api/v1/cash/request
// → Crea request, devuelve QR payload

// GET /api/v1/cash/request/:id
// → Consulta estado
```

### Dependencias

```json
{
  "leaflet": "^1.9.4",
  "@types/leaflet": "^1.9.21",
  "react-router-dom": "^7.14.1",
  "vitest": "^4.1.4",
  "@testing-library/react": "^16.3.2"
}
```

---

## Funcionalidades MVP

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **1. Balance** | Mostrar saldo USDC del usuario | ✅ |
| **2. Ingresar monto** | Input para MXN a retirar | ✅ |
| **3. Mapa interactivo** | Leaflet/OpenStreetMap con agents | ✅ |
| **4. Lista agents** | Cards con distancia, tasa, reputación | ✅ |
| **5. Solicitar retiro** | Llamar API, mostrar QR | ✅ |
| **6. Estado** | Polling del estado de la transacción | ✅ |

---

## Mejoras implementadas

| # | Mejora | Estado | Fecha |
|---|--------|--------|-------|
| 1 | Validación de config con Zod | ✅ | 2026-04-16 |
| 2 | Eliminar fallback demo en escrow | ✅ | 2026-04-16 |
| 3 | Tests con mocks | ✅ | 2026-04-16 |
| 4 | ESLint + TypeScript strict | ✅ | 2026-04-16 |
| 5 | Persistencia PostgreSQL | ✅ | 2026-04-16 |
| 6 | CI/CD con GitHub Actions | ✅ | 2026-04-16 |
| 7 | Reestructuración frontend | ✅ | 2026-04-17 |
| 8 | UI components reutilizables | ✅ | 2026-04-17 |
| 9 | MapView con Leaflet real | ✅ | 2026-04-17 |
| 10 | TransactionStatus con polling | ✅ | 2026-04-17 |
| 11 | Tests frontend con Vitest | ✅ | 2026-04-17 |

---

## Métricas

| Componente | Estado |
|------------|--------|
| **API Tests** | 127 passing |
| **API Lint** | 0 errors, 0 warnings |
| **Web Tests** | 6 passing |
| **Web Build** | successful |
| **Web Lint** | N/A (sin ESLint config) |

---

## Próximos pasos

1. [ ] Agregar más tests de integración
2. [ ] Configurar ESLint en el frontend
3. [ ] Implementar conexión real con wallet (Freighter)
4. [ ] Agregar animaciones y transiciones
5. [ ] PWA support para offline
6. [ ] Tests E2E con Playwright

---

## Tiempo invertido

| Fase | Tiempo |
|------|--------|
| Configuración inicial | 2 horas |
| API backend | 3 horas |
| Frontend restructuring | 2 horas |
| MapView + components | 2 horas |
| Tests | 1 hora |
| **Total** | ~10 horas |
