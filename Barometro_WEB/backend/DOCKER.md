# Backend con Docker

El desarrollo backend usa Docker para evitar depender de PHP/Composer instalados en el host.

## Servicios

- PostgreSQL 16: `docker-compose.yml` en la raiz.
- Laravel API: imagen `backend-backend`, construida desde `backend/Dockerfile`.

## Comandos

```powershell
.\scripts\docker.ps1 up
.\scripts\backend.ps1 install
.\scripts\backend.ps1 migrate
.\scripts\backend.ps1 start
.\scripts\backend.ps1 logs
.\scripts\backend.ps1 stop
```

## Conexion a base de datos

Los scripts conectan el backend a PostgreSQL de esta forma:

- Si existe la red Docker Compose `observatirio_default`, usan `--network observatirio_default` y `DB_HOST=postgres`.
- Si la red no existe, usan `host.docker.internal` como fallback.

Valores esperados:

```text
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=observatorio_uleam
DB_USERNAME=postgres
DB_PASSWORD=secret123
```

`backend/.env` se crea desde `.env.example` si no existe.

## Swagger

```powershell
.\scripts\backend.ps1 swagger
```

URLs:

- Swagger UI: http://localhost:8000/api/docs
- Swagger JSON: http://localhost:8000/api/documentation

## Produccion

Este repositorio no mantiene actualmente un `docker-compose.prod.yml` como flujo canonico. Para produccion, usar `backend/Dockerfile` como base y definir variables de entorno seguras en la plataforma de despliegue.
