<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;

// This task runs every night at midnight
Schedule::call(function () {
    // Delete tokens that are older than 48 hours and haven't been used
    DB::table('hospital_update_tokens')
        ->where('expires_at', '<', now())
        ->orWhereNotNull('used_at')
        ->delete();
})->daily()->name('prune-expired-tokens');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
