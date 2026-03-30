<?php

use App\Http\Controllers\HospitalController;
use App\Http\Controllers\MagicLinkController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\BeautyLeadController;
use App\Http\Controllers\WhatsAppBotController;
use Illuminate\Support\Facades\Route;

// ============================================================
// SEARCH — 60 requests/minute per IP
// ============================================================
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/hospitals', [HospitalController::class, 'index']);
});

// ============================================================
// HOSPITAL REGISTRATION — 5/min (stops spam)
// ============================================================
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/hospitals/register', [HospitalController::class, 'store']);
});

// ============================================================
// OUTBREAK ALERTS — public, cached in controller
// ============================================================
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/alerts', [FeedbackController::class, 'alerts']);
});

// ============================================================
// GPS-LOCKED FEEDBACK
// ============================================================
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/feedback', [FeedbackController::class, 'store']);
});

// ============================================================
// AESTHETICS LEAD CAPTURE
// ============================================================
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/leads', [BeautyLeadController::class, 'store']);
});

// ============================================================
// WHATSAPP BOT — Hospital-initiated update flow
// Hospital sends "update" → webhook fires → magic link sent back
// ============================================================
Route::post('/whatsapp/webhook', [WhatsAppBotController::class, 'webhook']);
Route::get('/whatsapp/webhook',  [WhatsAppBotController::class, 'webhook']); // verification handshake

Route::middleware('throttle:10,1')->group(function () {
    // Manual trigger for testing (also used by future WhatsApp button)
    Route::post('/whatsapp/request-update', [WhatsAppBotController::class, 'requestUpdate']);
});

// ============================================================
// HOSPITAL UPDATE PAGE — reads services, saves changes
// Called by MagicUpdate.jsx (/update?token=xxx)
// ============================================================
Route::middleware('throttle:20,1')->group(function () {
    Route::get('/hospital-update/services', [WhatsAppBotController::class, 'getServices']);
    Route::post('/hospital-update/save',    [WhatsAppBotController::class, 'saveUpdates']);
});

// ============================================================
// MAGIC LINK — legacy, kept for backward compatibility
// ============================================================
Route::middleware('throttle:10,1')->group(function () {
    Route::get('/magic-link/verify', [MagicLinkController::class, 'verify']);
});

// ============================================================
// ADMIN — send magic link manually
// ============================================================
Route::middleware('throttle:30,1')->prefix('admin')->group(function () {
    Route::post('/magic-link/send', [MagicLinkController::class, 'send']);
});