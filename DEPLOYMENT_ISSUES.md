# Railway Deployment - Problemas y Soluciones

## Problemas Encontrados

### 1. Dockerfile Original NO construía los packages del monorepo

**Síntoma**: El contenedor iniciaba pero el API fallaba porque los packages `@micopay/types` y `@micopay/sdk` no existían.

**Causa raíz**: El Dockerfile original solo copiaba `package*.json` y hacía `npm install`, pero:
- No copiaba el código fuente de los packages
- Nunca ejecutaba `turbo build` para compilar TypeScript
- Asumía que los `dist/` ya existían

### 2. Orden de operaciones incorrecto

**Problema**: El Dockerfile copiaba apps/api antes que los packages, pero el API depende de `@micopay/types` y `@micopay/sdk`.

### 3. Uso de tsx en vez de JavaScript compilado

**Problema**: El CMD usaba `node --import tsx apps/api/src/index.ts`, pero:
- tsx es una dependencia local (no global)
- Railway no tiene tsx instalado globalmente
- Ejecutar TypeScript directo es mas lento y usa mas memoria

### 4. Dependencias de desarrollo incluidas

**Problema**: `npm install --omit=dev` no funcionaba correctamente en el contexto del monorepo.

## Solución Implementada

El nuevo `Dockerfile.railway`:
1. Copia todo el workspace (root package.json, turbo.json, apps/, packages/)
2. Instala todas las dependencias con `npm install`
3. Ejecuta `turbo build` para compilar packages primero (tienendependsOn)
4. Construye el API
5. Limpia devDependencies con `npm prune --production`
6. Ejecuta el JavaScript compilado: `node apps/api/dist/index.js`

## Variables Requeridas en Railway

Para que el API inicie correctamente, estas variables deben estar configuradas:

```
PORT=8080
NODE_ENV=production
JWT_SECRET=<un valor seguro>
PLATFORM_STELLAR_ADDRESS=<dirección G...>
PLATFORM_SECRET_KEY=<secreto S...>
ESCROW_CONTRACT_ID=<contract ID>
STELLAR_NETWORK=TESTNET o PUBLIC
```

Opcionales:
- `STELLAR_RPC_URL`
- `MOCK_STELLAR=true` (para testing sin red Stellar)

## Errores Comunes y Soluciones

### "PLATFORM_STELLAR_ADDRESS not configured"
→ Faltan variables de entorno en Railway

### "JWT_SECRET must be changed from default"
→ Configurar `JWT_SECRET` en Railway

### "Cannot find module @micopay/types"
→ El build de los packages falló o no se ejecutó

### Health check falla
→ Verificar que el puerto sea 8080 y `/health` exista