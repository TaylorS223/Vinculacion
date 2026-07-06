# ULEAM PWA — Plataforma de Recolección de Datos

Sistema inspirado en **KoboCollect + KoboToolbox** para la recolección de datos móvil con una plataforma web de administración.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **Backend API** | Laravel 12, PHP 8.4 (Docker) |
| **Base de datos** | PostgreSQL 16 (Docker) |
| **Frontend Web** | Angular 21 con SSR, Bun 1.2.18 |
| **App Móvil** | Angular 21 standalone, Dexie.js (IndexedDB), PWA |
| **Auth** | Laravel Sanctum (tokens) |

---

## Estructura del proyecto

```
Vinculacion-main/
├── Barometro_WEB/                 # Plataforma web completa
│   ├── backend/                   #   Laravel API + Dockerfile
│   ├── frontend/                  #   Angular 21 web SPA
│   ├── scripts/                   #   Scripts de desarrollo (.ps1, .sh, .bat)
│   ├── docker-compose.yml         #   PostgreSQL 16
│   └── README.md                  #   Documentación detallada de la web
│
├── Barometro_MOVIL/
│   └── kobo-mobile/               # App móvil Angular 21
│       ├── src/app/
│       │   ├── inicio/            #   Pantalla principal con menú
│       │   ├── login/             #   Login con email + servidor
│       │   ├── lista-encuestas/   #   Lista de formularios descargados
│       │   ├── llenar-encuesta/   #   Llenar formulario (offline)
│       │   ├── borradores/        #   Borradores guardados
│       │   ├── listo-para-enviar/ #   Pendientes de envío
│       │   ├── enviados/          #   Formularios enviados
│       │   ├── ajustes/           #   Ajustes (idioma, modo oscuro, servidor)
│       │   ├── auth.service.ts    #   Servicio de autenticación
│       │   ├── sync.service.ts    #   Sincronización con el servidor
│       │   ├── db.service.ts      #   Dexie.js (IndexedDB)
│       │   ├── storage.service.ts #   Almacenamiento de respuestas
│       │   ├── theme.service.ts   #   Modo oscuro + idioma
│       │   └── translate.pipe.ts  #   Pipe de traducción ES/EN
│       └── ...
│
└── README.md                      # Este archivo
```

---

## Funcionalidades implementadas (app móvil)

### Autenticación
- Login con email + contraseña + URL del servidor
- Tokens Sanctum que **no revocan** sesiones activas (web y móvil simultáneos)
- Modo demo sin conexión

### Descarga de formularios
- Selector con checkboxes: elige qué formularios bajar del servidor
- Almacenamiento en IndexedDB para uso offline

### Llenado de formularios
- Soporta tipos: TEXT, NUMBER, SINGLE_CHOICE, MULTIPLE_CHOICE, LIKERT (matriz)
- **Guardar borrador** → `estado: 'borrador'` (se puede continuar después)
- **Guardar y enviar** → `estado: 'listo-para-enviar'` (pendiente de sincronización)
- Carga automática del borrador previo si existe

### Envío al servidor
- Lista de pendientes con selección múltiple
- Progreso de envío
- Incluye `user_id` + `duration` + respuestas en JSON

### Gestión local
- **Borradores**: ver, continuar llenando, eliminar
- **Enviados**: historial de formularios subidos
- **Borrar formularios**: selector con checkboxes (solo local, no del servidor)

### Modo oscuro
- Toggle en Ajustes y en el header del Inicio
- Paleta de colores tipo GitHub Dark (`#0d1117`)
- Persiste en `localStorage`
- CSS variables en todos los componentes

### Idioma (ES/EN)
- Toggle en Ajustes y en el header del Inicio
- Traducción de etiquetas principales con pipe `| translate`
- Persiste en `localStorage`

---

## Requisitos previos

| Herramienta | Versión | Propósito |
|------------|---------|-----------|
| Docker Desktop | última | PostgreSQL + backend Laravel |
| Bun | 1.2.18+ | Frontend web |
| Node.js | 20+ | App móvil |
| npm | 10+ | App móvil |

---

## Cómo iniciar todo

> **IMPORTANTE sobre Docker**: PostgreSQL y el backend Laravel corren **cada uno en su propio contenedor**. Deben estar en la **misma red de Docker** para comunicarse. Si usas `docker run` sin especificar `--network`, no se verán entre sí y fallará la conexión a la base de datos.

### Paso 1 — PostgreSQL

```powershell
# Desde Vinculacion-main/Barometro_WEB/
docker-compose up -d
```

Esto crea:
- Contenedor `observatorio_db` con PostgreSQL 16
- Red `barometro_web_default`
- Puerto `5433` en tu PC → `5432` dentro del contenedor
- Base de datos: `observatorio_uleam`, usuario: `postgres`, contraseña: `secret123`

---

### Paso 2 — Backend (Laravel API)

#### 2a. Construir la imagen (solo la primera vez)

```powershell
cd Barometro_WEB/backend
docker build -t observatorio-backend .
```

#### 2b. Iniciar el contenedor

El backend necesita dos cosas para funcionar:
1. **Estar en la misma red que PostgreSQL** (`--network backend_observatorio-network`)
2. **Tener acceso al archivo `.env`** (porque el entrypoint escribe la `APP_KEY` ahí)

```powershell
# Desde Barometro_WEB/backend/
docker run -d --name observatorio-backend -p 8000:8000 `
  --network backend_observatorio-network `
  -v "${PWD}/.env:/var/www/html/.env" `
  observatorio-backend
```

**Explicación de cada flag:**
| Flag | Por qué |
|------|---------|
| `-p 8000:8000` | Expone la API en tu `localhost:8000` |
| `--network backend_observatorio-network` | Conecta el backend a la misma red que PostgreSQL para que se vean |
| `-v "${PWD}/.env:/var/www/html/.env"` | Monta el `.env` dentro del contenedor (necesario para que Laravel genere la `APP_KEY`) |

#### 2c. Verificar que funciona

```powershell
# Ver logs
docker logs observatorio-backend

# Probar la API
curl http://localhost:8000/api/forms
```

Si ves algo como `"message": "Unauthenticated."` es normal — significa que la API responde.

#### 2d. Volver a encender el backend después de apagar

```powershell
docker start observatorio-backend
```

#### 2e. Si cambias el `.env` y necesitas reiniciar

```powershell
docker rm -f observatorio-backend
docker run -d --name observatorio-backend -p 8000:8000 `
  --network backend_observatorio-network `
  -v "${PWD}/.env:/var/www/html/.env" `
  observatorio-backend
```

---

### Paso 3 — Frontend Web (Angular 21)

```powershell
# Desde Barometro_WEB/frontend/
bun install
bun run start
# Abre en: http://localhost:4200
```

> Puerto fijo en `angular.json` línea 76: `"port": 4200`

---

### Paso 4 — App Móvil (Angular 21 + PWA)

```powershell
# Desde Barometro_MOVIL/kobo-mobile/
npm install
npx ng serve
# Abre en: http://localhost:4201
```

> Puerto fijo en `angular.json` línea 64: `"port": 4201`

---

### Resumen: orden de arranque

```
1. docker-compose up -d          → PostgreSQL (puerto 5433)
2. docker run ... observatorio-backend  → Backend API (puerto 8000)
3. bun run start (frontend/)     → Frontend web (puerto 4200)
4. npx ng serve (kobo-mobile/)   → App móvil (puerto 4201)
```

---

## Solución de problemas comunes

### "Connection refused" en `localhost:8000/api/forms`
→ El backend no está corriendo o no conecta con PostgreSQL.

Verifica:
```powershell
docker ps                       # ¿está el contenedor vivo?
docker logs observatorio-backend  # ¿hay errores de conexión?
docker network ls               # ¿existe la red backend_observatorio-network?
```

### "port 4200 is already in use"
→ Otro proceso ocupa ese puerto (ej: la app móvil arrancó antes sin configuración de puerto).

Solución:
```powershell
# Encontrar qué proceso
netstat -ano | findstr :4200
# Matarlo (reemplazar <PID> con el número)
taskkill /pid <PID> /f
```

O simplemente reinicia tu PC si es más rápido.

### "No se puede cargar el archivo .ps1" (error de firma)
→ PowerShell bloquea la ejecución de scripts.

Solución (una sola vez):
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
```

### El backend inicia pero responde vacío (ERR_EMPTY_RESPONSE)
→ Casi siempre es porque el `.env` no está montado como volumen y la `APP_KEY` no se generó.

Solución: borra y recrea el contenedor montando el `.env`:
```powershell
docker rm -f observatorio-backend
# usar el comando del paso 2b con -v
```

---

## URLs por servicio

| Servicio | URL |
|----------|-----|
| Frontend Web | http://localhost:4200 |
| App Móvil | http://localhost:4201 |
| Backend API | http://localhost:8000/api |
| Swagger UI | http://localhost:8000/api/docs |
| PostgreSQL | `localhost:5433` — user: `postgres`, pass: `secret123`, db: `observatorio_uleam` |

---

## Flujo de uso (app móvil)

1. Abrir http://localhost:4201
2. Ingresar:
   - **Servidor**: `http://localhost:8000`
   - **Email**: (el que te asignó el admin)
   - **Contraseña**: (la que te asignó el admin)
3. En el Inicio, presionar **Descargar formulario** → seleccionar los que necesites
4. Ir a **Llenar nuevo formulario** → elegir uno
5. Llenar las preguntas, usar **💾 Guardar Borrador** o **✅ Guardar y Enviar**
6. Desde el Inicio, acceder a **Borradores**, **Listo para enviar** o **Enviados**
7. En Ajustes: cambiar idioma (ES/EN), modo oscuro, URL del servidor

---

## Endpoints clave (backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Login (email + password) |
| GET | `/api/mobile/forms` | Lista de formularios DEPLOYED para móvil |
| POST | `/api/mobile/submit` | Enviar respuestas desde la app |
| POST | `/api/collect/{uuid}` | Submit público por link_uuid |

---

## Documentación relacionada

- [`Barometro_WEB/README.md`](./Barometro_WEB/README.md) — Documentación completa del frontend web
- [`Barometro_WEB/backend/README.md`](./Barometro_WEB/backend/README.md) — Backend: rutas, roles, Swagger
- [`Barometro_WEB/backend/DOCKER.md`](./Barometro_WEB/backend/DOCKER.md) — Docker workflow detallado
- [`Barometro_WEB/docs/ESTADO_PROYECTO_KOBO.md`](./Barometro_WEB/docs/ESTADO_PROYECTO_KOBO.md) — Estado del proyecto
