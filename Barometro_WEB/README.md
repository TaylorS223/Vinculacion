# Observatorio ULEAM - Plataforma de Formularios

Aplicacion full-stack para crear formularios dinamicos, publicarlos mediante enlaces de recoleccion y consultar respuestas. El proyecto fue refactorizado desde un observatorio de archivos Excel hacia un flujo tipo KoboToolbox / Google Forms.

## Stack

- Backend: Laravel 12 API, PHP 8.4 en Docker para desarrollo.
- Frontend: Angular 21 con SSR.
- Base de datos: PostgreSQL 16 en Docker. El backend detecta la red interna de Docker Compose cuando esta disponible.
- Auth: Laravel Sanctum con tokens.
- Frontend package manager: Bun 1.2.18.

## Flujo funcional

- Login con usuarios creados desde administracion.
- Gestion de usuarios segun rol global.
- Creacion y edicion de formularios.
- Preguntas dinamicas con opciones y validaciones basicas.
- Proyectos con lideres asignados por Admin o Super Admin.
- Comparticion de formularios con permisos `EDITOR` o `RECOLECTOR`.
- Publicacion mediante enlace `/collect/:uuid`.
- Captura publica de respuestas.
- Dashboard de formularios y vista de respuestas/exportacion.

## Roles

- `SUPER_ADMIN`: control total sobre usuarios, proyectos, formularios, configuracion y datos.
- `ADMIN`: gestiona proyectos, asigna lideres de proyecto y puede crear/gestionar formularios.
- `PROJECT_LEADER`: crea y gestiona formularios y permisos dentro de proyectos asignados.
- `USER`: usuario recolector/editor; recolecta datos y solo edita formularios con permiso explicito `EDITOR`.

## Estructura

```text
backend/   Laravel API
frontend/  Angular SPA/SSR
scripts/   Wrappers de desarrollo para PowerShell, Bash y CMD
docs/      Documentacion operativa y tecnica
docker-compose.yml  PostgreSQL local
```

## Inicio rapido

```powershell
.\scripts\install.ps1
.\scripts\start.ps1 all
```

En CMD:

```cmd
scripts\install.bat
scripts\start.bat all
```

En Bash:

```bash
./scripts/install.sh
./scripts/start.sh all
```

## Comandos utiles

```powershell
.\scripts\frontend.ps1 install
.\scripts\frontend.ps1 start
.\scripts\frontend.ps1 build

.\scripts\backend.ps1 install
.\scripts\backend.ps1 migrate
.\scripts\backend.ps1 routes
.\scripts\backend.ps1 start
```

## URLs

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:4200 |
| API | http://localhost:8000/api |
| Swagger UI | http://localhost:8000/api/docs |
| Swagger JSON | http://localhost:8000/api/documentation |
| PostgreSQL | localhost:5433 |

Swagger se genera desde los controladores activos de formularios, proyectos, autenticacion, perfil, usuarios y seed. No expone endpoints heredados del proyecto anterior.

## Estado actual

El proyecto activo esta centrado en formularios. Las rutas, controladores, modelos y carpetas heredadas del antiguo observatorio fueron retiradas del backend y del frontend.

## Validacion

```powershell
.\scripts\frontend.ps1 build
.\scripts\backend.ps1 routes
.\scripts\backend.ps1 migrate
```
