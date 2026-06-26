# Backend - Laravel API

API REST para la plataforma de formularios dinamicos del Observatorio ULEAM.

## Responsabilidades

- Autenticacion con Sanctum.
- Gestion administrativa de usuarios.
- Roles globales `SUPER_ADMIN`, `ADMIN`, `PROJECT_LEADER` y `USER`.
- Gestion de proyectos y asignacion de lideres de proyecto.
- CRUD de formularios y preguntas.
- Ciclo de vida de formularios: borrador, implementado y archivado.
- Comparticion de formularios con permisos `EDITOR` o `RECOLECTOR`.
- Recoleccion publica por `link_uuid`.
- Consulta de respuestas, estadisticas y exportacion.
- Seed inicial de usuario super admin.

## Desarrollo con Docker

El backend se ejecuta dentro de una imagen Docker construida desde `backend/Dockerfile`. PostgreSQL corre con `docker-compose.yml` en la raiz.

```powershell
.\scripts\docker.ps1 up
.\scripts\backend.ps1 install
.\scripts\backend.ps1 migrate
.\scripts\backend.ps1 start
```

Comandos equivalentes en Bash:

```bash
./scripts/docker.sh up
./scripts/backend.sh install
./scripts/backend.sh migrate
./scripts/backend.sh start
```

## Comandos backend

```powershell
.\scripts\backend.ps1 routes
.\scripts\backend.ps1 swagger
.\scripts\backend.ps1 cache-clear
.\scripts\backend.ps1 migrate-fresh-seed
.\scripts\backend.ps1 logs
```

## Rutas principales

- `POST /api/login`
- `POST /api/logout`
- `GET /api/user`
- `GET|POST /api/forms`
- `GET|PUT|DELETE /api/forms/{id}`
- `GET|POST /api/projects`
- `GET|PUT|DELETE /api/projects/{id}`
- `POST /api/forms/{id}/questions`
- `POST /api/forms/{id}/deploy`
- `POST /api/forms/{id}/archive`
- `GET /api/forms/{id}/responses`
- `GET /api/forms/{id}/stats`
- `GET /api/forms/{id}/export`
- `GET /api/forms/fetch/{link_uuid}`
- `POST /api/forms/submit/{link_uuid}`
- `POST /api/seed/admin`

## Roles y permisos

- `SUPER_ADMIN`: control total sobre usuarios, proyectos, formularios, configuracion y datos.
- `ADMIN`: gestiona proyectos, asigna lideres y crea/gestiona formularios.
- `PROJECT_LEADER`: gestiona formularios y permisos dentro de proyectos asignados.
- `USER`: recolecta datos y edita formularios solo cuando recibe permiso `EDITOR`.

Los permisos de formulario no son roles globales; viven en `form_user_shares` como `EDITOR` o `RECOLECTOR`.

La fuente de verdad es `backend/routes/api.php` y los archivos activos en `backend/routes/modules/`.

## Swagger

- UI: `GET /api/docs`
- JSON: `GET /api/documentation`
- Generacion: `.\scripts\backend.ps1 swagger`

La documentacion se genera solo desde controladores activos: Auth, Forms, Projects, Profile, Seed y Users.

Para probar rutas protegidas en Swagger:

1. Ejecutar `POST /api/login`.
2. Copiar el valor `token` de la respuesta.
3. Pulsar `Authorize` en Swagger y pegar solo el token.
4. Ejecutar rutas protegidas como `POST /api/users`.

## Configuracion

Si `backend/.env` no existe, los scripts lo crean desde `.env.example`. En ejecucion Docker, los scripts detectan la red donde esta conectado `observatorio_db`, usan `DB_HOST=postgres` y `DB_PORT=5432`; si no encuentran el contenedor de PostgreSQL, usan `host.docker.internal` y el puerto publicado `5433` como fallback.

## Notas de refactor

El backend quedo orientado a formularios dinamicos. No agregar rutas, modelos o carpetas del antiguo observatorio salvo decision explicita del proyecto.
