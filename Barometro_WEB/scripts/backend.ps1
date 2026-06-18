# Backend Scripts (Laravel/PHP 8.4 via Docker)
# Usage: .\scripts\backend.ps1 <start|stop|logs|install|migrate|seed|migrate-fresh|migrate-fresh-seed|cache-clear|swagger|routes|tinker|help>

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'logs', 'install', 'migrate', 'seed', 'migrate-fresh', 'migrate-fresh-seed', 'cache-clear', 'swagger', 'routes', 'tinker', 'help')]
    [string]$Command = 'help'
)

$BackendPath = Join-Path $PSScriptRoot '..\backend'
$ImageName = 'backend-backend'
$ContainerName = 'observatorio-backend-dev'
$EnvFile = Join-Path $BackendPath '.env'
$ComposeNetwork = 'observatirio_default'

function Ensure-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        Copy-Item (Join-Path $BackendPath '.env.example') $EnvFile
        Write-Host 'Created backend/.env from .env.example' -ForegroundColor Yellow
    }
}

function Ensure-BackendImage {
    docker image inspect $ImageName *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker image $ImageName not found. Building..." -ForegroundColor Yellow
        docker build -t $ImageName -f Dockerfile .
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}

function Get-DbRuntime {
    docker network inspect $ComposeNetwork *> $null
    if ($LASTEXITCODE -eq 0) {
        return [pscustomobject]@{ Args = @('--network', $ComposeNetwork); Host = 'postgres' }
    }

    return [pscustomobject]@{ Args = @('--add-host=host.docker.internal:host-gateway'); Host = 'host.docker.internal' }
}

function Get-DevMountArgs {
    return @(
        '-v', "$BackendPath/app:/var/www/html/app",
        '-v', "$BackendPath/bootstrap:/var/www/html/bootstrap",
        '-v', "$BackendPath/config:/var/www/html/config",
        '-v', "$BackendPath/database:/var/www/html/database",
        '-v', "$BackendPath/resources:/var/www/html/resources",
        '-v', "$BackendPath/routes:/var/www/html/routes",
        '-v', "$BackendPath/storage:/var/www/html/storage",
        '-v', "$BackendPath/composer.json:/var/www/html/composer.json",
        '-v', "$BackendPath/composer.lock:/var/www/html/composer.lock"
    )
}

function Run-Artisan {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )

    Ensure-EnvFile
    Ensure-BackendImage
    $db = Get-DbRuntime
    $dockerArgs = @('run', '--rm') + $db.Args + (Get-DevMountArgs) + @('--env-file', $EnvFile, '-e', "DB_HOST=$($db.Host)", '--entrypoint', 'php', $ImageName, 'artisan') + $Args
    & docker @dockerArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Push-Location $BackendPath
try {
    switch ($Command) {
        'start' {
            Ensure-EnvFile
            Ensure-BackendImage
            $db = Get-DbRuntime
            Write-Host 'Starting backend at http://127.0.0.1:8000 with PHP 8.4 (Docker)...' -ForegroundColor Green
            docker rm -f $ContainerName 2>$null | Out-Null
            $dockerArgs = @('run', '-d', '--name', $ContainerName, '--rm', '-p', '8000:8000') + $db.Args + (Get-DevMountArgs) + @('--env-file', $EnvFile, '-e', "DB_HOST=$($db.Host)", '--entrypoint', 'php', $ImageName, 'artisan', 'serve', '--host=0.0.0.0', '--port=8000')
            & docker @dockerArgs | Out-Null
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            Write-Host "Backend started using DB_HOST=$($db.Host)." -ForegroundColor Green
        }
        'stop' {
            docker rm -f $ContainerName 2>$null | Out-Null
            Write-Host 'Backend stopped.' -ForegroundColor Green
        }
        'logs' { docker logs -f $ContainerName }
        'install' {
            Ensure-EnvFile
            Write-Host 'Building backend image...' -ForegroundColor Green
            docker build -t $ImageName -f Dockerfile .
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
        'migrate' { Run-Artisan migrate --force }
        'seed' { Run-Artisan db:seed --force }
        'migrate-fresh' { Run-Artisan migrate:fresh --force }
        'migrate-fresh-seed' { Run-Artisan migrate:fresh --seed --force }
        'cache-clear' {
            Run-Artisan config:clear
            Run-Artisan cache:clear
            Run-Artisan route:clear
            Run-Artisan view:clear
        }
        'swagger' { Run-Artisan swagger:generate }
        'routes' { Run-Artisan route:list --path=api }
        'tinker' { Run-Artisan tinker }
        'help' {
            Write-Host 'Backend Scripts - commands:' -ForegroundColor Yellow
            Write-Host '  start              - Start Laravel API in Docker'
            Write-Host '  stop               - Stop Laravel API container'
            Write-Host '  logs               - Follow backend logs'
            Write-Host '  install            - Build backend Docker image'
            Write-Host '  migrate            - Run migrations'
            Write-Host '  seed               - Run seeders'
            Write-Host '  migrate-fresh      - Drop and recreate database schema'
            Write-Host '  migrate-fresh-seed - Drop, recreate and seed database'
            Write-Host '  cache-clear        - Clear Laravel caches'
            Write-Host '  swagger            - Generate Swagger docs'
            Write-Host '  routes             - List API routes'
            Write-Host '  tinker             - Start Laravel REPL'
        }
    }
} finally {
    Pop-Location
}
