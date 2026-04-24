# Deploy MicoPay en Railway - Lecciones Aprendidas

## Historial de Problemas

### Intento 1-15: Fallas Repetidas
- El contenedor no iniciaba
- Errores de "Cannot find module @micopay/types"
- Health check fallando
- El servidor iniciaba pero moría inmediatamente

---

## Problemas Identificados y Soluciones

### 1. Dockerfile NO construía los packages del monorepo

| Antes (Roto) | Después (Corregido) |
|--------------|---------------------|
| Copiaba solo `package*.json` | Copia todo el workspace |
| Ejecutaba `npm install` | Ejecuta `npm install` |
| NO construía los packages | Ejecuta `turbo build` |
| Asumía que `dist/` existía | Build genera los `dist/` |

**Causa raíz**: Turbo es un monorepo donde los packages deben compilarse antes que los apps.

### 2. Usaba tsx para ejecutar TypeScript directo

| Antes (Roto) | Después (Corregido) |
|--------------|---------------------|
| `node --import tsx apps/api/src/index.ts` | `node apps/api/dist/index.js` |
| tsx no está en imagen base | JS compilado es más rápido |
| Runtime más lento y pesado | Imagen más ligera |

### 3. Orden de operaciones incorrecto

El Dockerfile debe:
1. Copiar package.json del root
2. Copiar package.json de apps y packages
3. `npm install` (todo el workspace)
4. Copiar fuentes (apps/ y packages/)
5. `turbo build --filter=@micopay/types --filter=@micopay/sdk`
6. `turbo build --filter=@micopay/api`
7. `npm prune --production`
8. Ejecutar `node apps/api/dist/index.js`

### 4. Falta .dockerignore

Sin .dockerignore, Docker intenta incluir archivos innecesarios (node_modules, .git, etc).

---

## Variables Requeridas en Railway

```
# REQUERIDAS
PORT=8080
NODE_ENV=production
JWT_SECRET=<secret-seguro>

# Plataformas Stellar
PLATFORM_STELLAR_ADDRESS=GAE2SI3SNW6KAZ43GMPTJ5WRFVQYGJCU7R7TUYF4BO55F6WS7XXCZNJL
PLATFORM_SECRET_KEY=SCBHAHO2OHS45VWLER624UOWEIFQH4ROFEX3RDF5PFTN4O526WVPIONY
ESCROW_CONTRACT_ID=CCFV74IRTIXN32JCQR3SWZP63NEIIHMQPLJQTK5SB5WIMFGMZMXVNFOX

# Opcionales
DATABASE_URL=postgresql://...
SECRET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
STELLAR_NETWORK=TESTNET
MOCK_STELLAR=false
```

**⚠️ IMPORTANTE**: 
- `NODE_ENV=production` es obligatorio, si no el JWT_SECRET falla
- El JWT_SECRET no puede ser el valor por defecto

---

## Checklist para Futuros Deploys

- [ ] Dockerfile incluye `turbo build` para packages
- [ ] CMD ejecuta JS compilado, NO tsx
- [ ] .dockerignore existe
- [ ] Variables en Railway: `NODE_ENV=production`
- [ ] Build local funciona: `npm run build && node apps/api/dist/index.js`

---

## Comandos Útiles

# Build local (probar antes de push)
npm run build

# Probar el server compilado
PORT=8080 NODE_ENV=production JWT_SECRET=test node apps/api/dist/index.js

# Build con Docker local
docker build -t micopay -f Dockerfile.railway .

# Ver logs de Railway
railway logs