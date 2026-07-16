<?php

namespace App\Providers;

use App\Application\Responses\Contracts\SupabaseResponseWriter;
use App\Infrastructure\Supabase\HttpSupabaseResponseWriter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SupabaseResponseWriter::class, HttpSupabaseResponseWriter::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
