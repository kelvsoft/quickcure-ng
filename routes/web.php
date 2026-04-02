<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\HospitalRegistrationController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ============================================================
// AUTH ROUTES - MUST BE FIRST
// ============================================================
require __DIR__ . '/auth.php';

// ============================================================
// PUBLIC
// ============================================================
Route::get('/', fn() => Inertia::render('Emergency/Search'))->name('home');
Route::get('/update', fn() => Inertia::render('Hospital/MagicUpdate'))->name('hospital.update');
Route::get('/legal',  fn() => Inertia::render('Legal'))->name('legal');

// Emergency hospital registration — fast track
Route::get('/register-hospital',  [HospitalRegistrationController::class, 'showEmergency'])->name('hospital.register');
Route::post('/register-hospital', [HospitalRegistrationController::class, 'storeEmergency'])->name('hospital.register.store');

// Beauty clinic registration — strict track
Route::get('/register-clinic',    [HospitalRegistrationController::class, 'showBeauty'])->name('clinic.register');
Route::post('/register-clinic',   [HospitalRegistrationController::class, 'storeBeauty'])->name('clinic.register.store');

// ============================================================
// ADMIN — protected by auth + verified
// ============================================================
Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {

    // Dashboard
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Existing hospital management
    Route::patch('/hospitals/{hospital}/verify', [AdminDashboardController::class, 'verify'])->name('hospitals.verify');

    // Outbreak alerts
    Route::post('/alerts',           [AdminDashboardController::class, 'storeAlert'])->name('alerts.store');
    Route::delete('/alerts/{alert}', [AdminDashboardController::class, 'deleteAlert'])->name('alerts.delete');

    // Emergency registrations — fast queue
    Route::patch('/registrations/emergency/{registration}/approve', [AdminDashboardController::class, 'approveEmergency'])->name('registrations.emergency.approve');
    Route::patch('/registrations/emergency/{registration}/reject',  [AdminDashboardController::class, 'rejectEmergency'])->name('registrations.emergency.reject');

    // Beauty registrations — strict queue
    Route::patch('/registrations/beauty/{registration}/approve',      [AdminDashboardController::class, 'approveBeauty'])->name('registrations.beauty.approve');
    Route::patch('/registrations/beauty/{registration}/reject',       [AdminDashboardController::class, 'rejectBeauty'])->name('registrations.beauty.reject');
    Route::patch('/registrations/beauty/{registration}/under-review', [AdminDashboardController::class, 'markBeautyUnderReview'])->name('registrations.beauty.review');

    Route::get('/documents/{path}', [AdminDashboardController::class, 'viewDocument'])
    ->name('admin.documents.view')
    ->where('path', '.*');
});

// ============================================================
// AUTH
// ============================================================
Route::middleware('auth')->group(function () {
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

