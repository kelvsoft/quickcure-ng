<?php

use App\Http\Controllers\HospitalController;
use App\Http\Controllers\MagicLinkController;
use Illuminate\Support\Facades\Route;

// =========================================================
// PUBLIC: Emergency Search — 60 requests/minute
// =========================================================
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/hospitals', [HospitalController::class, 'index']);
});

// =========================================================
// PUBLIC: Hospital Registration — 5 requests/minute (stops spam)
// =========================================================
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/hospitals/register', [HospitalController::class, 'store']);
});

// =========================================================
// PUBLIC: Magic Link Verify — hospital clicks link from WhatsApp
// =========================================================
Route::middleware('throttle:10,1')->group(function () {
    Route::get('/magic-link/verify', [MagicLinkController::class, 'verify']);
});

// =========================================================
// ADMIN: Send Magic Link — internal use only
// Add 'auth:sanctum' here later when admin auth is ready
// =========================================================
Route::middleware('throttle:30,1')->prefix('admin')->group(function () {
    Route::post('/magic-link/send', [MagicLinkController::class, 'send']);
});