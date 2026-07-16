<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('responses:sync-pending {--limit=200}', function () {
    $this->call(\App\Console\Commands\SyncPendingResponses::class, [
        '--limit' => (int) $this->option('limit'),
    ]);
})->purpose('Despacha respuestas pendientes para sincronizar en Supabase');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
