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
| Docker | última | PostgreSQL + backend Laravel |
| Bun | 1.2.18+ | Frontend web |
| Node.js | 20+ | App móvil |
| npm | 10+ | App móvil |

---

## Cómo iniciar todo

> **IMPORTANTE sobre Docker**: PostgreSQL y el backend Laravel corren **cada uno en su propio contenedor**. Deben estar en la **misma red de Docker** para comunicarse. La red se crea automáticamente al levantar PostgreSQL con `docker compose`.

### Paso 1 — PostgreSQL

```bash
cd Barometro_WEB
docker compose up -d
```

Esto crea:
- Contenedor `observatorio_db` con PostgreSQL 16
- Red `barometro_web_default`
- Puerto `5433` en tu PC → `5432` dentro del contenedor
- Base de datos: `observatorio_uleam`, usuario: `postgres`, contraseña: `secret123`

---

### Paso 2 — Backend (Laravel API)

#### 2a. Configurar `.env`

```bash
cd Barometro_WEB/backend
cp .env.example .env
```

Asegúrate de que el `.env` tenga estos valores para conexión con PostgreSQL **dentro de Docker**:

```
DB_HOST=observatorio_db
DB_PORT=5432
DB_DATABASE=observatorio_uleam
DB_USERNAME=postgres
DB_PASSWORD=secret123
```

#### 2b. Construir la imagen (solo la primera vez)

```bash
docker build -t observatorio-backend .
```

#### 2c. Iniciar el contenedor

```bash
docker run -d --name observatorio-backend -p 8000:8000 \
  --network barometro_web_default \
  -v "$(pwd)/.env:/var/www/html/.env" \
  observatorio-backend
```

**Explicación de cada flag:**
| Flag | Por qué |
|------|---------|
| `-p 8000:8000` | Expone la API en tu `localhost:8000` |
| `--network barometro_web_default` | Conecta el backend a la misma red que PostgreSQL |
| `-v "$(pwd)/.env:/var/www/html/.env"` | Monta el `.env` dentro del contenedor |

#### 2d. Verificar que funciona

```bash
curl http://localhost:8000/api/forms
```

Si ves `{"message":"No autenticado."}` es normal — significa que la API responde correctamente.

#### 2e. Migraciones y Super Admin

Las migraciones se ejecutan automáticamente al iniciar el contenedor. Si necesitas ejecutarlas manualmente:

```bash
docker exec observatorio-backend php artisan migrate --force
```

Para crear el Super Admin:

```bash
docker exec observatorio-backend php artisan db:seed --class=AdminUserSeeder
```

**Credenciales**: `admin@uleam.edu.ec` / `Admin123456!`

#### 2f. Volver a encender el backend después de apagar

```bash
docker start observatorio-backend
```

#### 2g. Si cambias el `.env` y necesitas reiniciar

```bash
docker rm -f observatorio-backend
docker run -d --name observatorio-backend -p 8000:8000 \
  --network barometro_web_default \
  -v "$(pwd)/.env:/var/www/html/.env" \
  observatorio-backend
```

---

### Paso 3 — Frontend Web (Angular 21)

```bash
cd Barometro_WEB/frontend
bun install
bun run start
# Abre en: http://localhost:4200
```

> Puerto fijo en `angular.json` línea 76: `"port": 4200`

---

### Paso 4 — App Móvil (Angular 21 + PWA)

```bash
cd Barometro_MOVIL/kobo-mobile
npm install
npx ng serve
# Abre en: http://localhost:4201
```

> Puerto fijo en `angular.json` línea 64: `"port": 4201`

---

### Resumen: orden de arranque

```
1. docker compose up -d                → PostgreSQL (puerto 5433)
2. docker run ... observatorio-backend → Backend API (puerto 8000)
3. bun run start (frontend/)           → Frontend web (puerto 4200)
4. npx ng serve (kobo-mobile/)         → App móvil (puerto 4201)
```

---

## Solución de problemas comunes

### "Connection refused" en `localhost:8000/api/forms`
→ El backend no conecta con PostgreSQL.

Verifica:
```bash
docker ps                              # ¿están los contenedores vivos?
docker logs observatorio-backend       # ¿hay errores de conexión?
```

Si ves `Connection refused` a `127.0.0.1:5433`, asegúrate de que en `backend/.env` tengas:
```
DB_HOST=observatorio_db
DB_PORT=5432
```

### "port 4200 is already in use"
→ Otro proceso ocupa ese puerto.

Solución en Linux:
```bash
sudo lsof -i :4200  # encontrar el proceso
kill -9 <PID>       # matarlo
```

### El backend inicia pero responde vacío (ERR_EMPTY_RESPONSE)
→ El `.env` no está montado o la `APP_KEY` no se generó.

Solución: borra y recrea el contenedor montando el `.env`:
```bash
docker rm -f observatorio-backend
# usar el comando del paso 2c con -v
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
