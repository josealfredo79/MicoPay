# Pendientes - MicoPay Deployment

## Estado Actual

El proyecto está desplegado en Railway con 2 servicios:
- `micopay-backend-production.up.railway.app` →Error 401
- `micopay-production.up.railway.app` → Error 500

## Problemas Identificados

### 1. Error 401 (Unauthorized)
- El usuario no está registrado en la base de datos
- No se puede crear usuario porque DATABASE_URL no funciona o no está configurado

### 2. Error 500 (Internal Server Error)
- DATABASE_URL no está configurado en el servicio `micopay`
- La tabla `cash_requests` no existe

## Solutions Pendientes

### Para micopay (el que da 500):
Agregar variable:
```
DATABASE_URL=postgresql://neondb_owner:npg_AGvFow1M6zxa@ep-wandering-recipe-anstrv0h-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=verify-full
```

### Para micopay-backend (el que da 401):
1. Verificar que DATABASE_URL esté configurado
2. El usuario debe registrarse primero (llamar `/users/register`)
3. Luego hacer el flujo auth: `/auth/challenge` → `/auth/token`

## Rutas Importantes del Backend

```
micopay-backend (puerto 3002):
- POST /users/register    → Crear usuario
- POST /auth/challenge   → Obtener challenge
- POST /auth/token     → Obtener JWT
- GET  /trades/history → Ver trades (requiere JWT)

micopay-api (puerto 8080):
- POST /api/v1/cash/request → Crear request
- GET  /api/v1/cash/request/:id → Ver status
```

---

*Última actualización: 2026-04-24*