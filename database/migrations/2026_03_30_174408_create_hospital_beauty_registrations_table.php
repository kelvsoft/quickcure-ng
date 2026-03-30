<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two separate registration tables.
 * Emergency: fast track, hospital license only
 * Beauty: strict track, individual surgeon verification + file uploads
 *
 * Run:
 * php artisan make:migration create_hospital_registrations_beauty_registrations
 * Paste this content → php artisan migrate
 */
return new class extends Migration {
    public function up(): void
    {
        // =====================================================
        // EMERGENCY REGISTRATION — Fast Track (24-48hrs)
        // =====================================================
        Schema::create('hospital_registrations', function (Blueprint $table) {
            $table->id();

            // Hospital identity
            $table->string('hospital_name');
            $table->string('address');
            $table->string('state');
            $table->string('lga')->nullable();
            $table->decimal('lat', 11, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();

            // Contact — WhatsApp is their update identity
            $table->string('whatsapp_number')->unique();
            $table->string('email')->unique();
            $table->string('contact_person');

            // Verification
            $table->string('mdcn_license');         // Required — hospital facility license
            $table->string('cac_number')->nullable();

            // Services they offer — stored as JSON array of service names
            // e.g. ["Anti-Venom", "Blood Bank (O+)", "ICU Bed"]
            $table->json('selected_services');

            // Admin review
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });

        // =====================================================
        // BEAUTY REGISTRATION — Strict Track (5-7 business days)
        // =====================================================
        Schema::create('beauty_registrations', function (Blueprint $table) {
            $table->id();

            // Clinic identity
            $table->string('clinic_name');
            $table->string('address');
            $table->string('state');
            $table->string('lga')->nullable();
            $table->decimal('lat', 11, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();

            // Surgeon — individual verification (not just the clinic)
            $table->string('surgeon_name');         // Dr. Full Name
            $table->string('surgeon_mdcn');         // INDIVIDUAL surgeon MDCN number
            $table->string('lsmoh_license')->nullable(); // Lagos State Ministry of Health
            $table->string('specialty_board')->nullable(); // Optional board certification
            $table->integer('years_experience');
            $table->integer('procedures_performed')->default(0); // Approx count

            // Contact
            $table->string('whatsapp_number')->unique();
            $table->string('email')->unique();
            $table->string('instagram')->nullable();
            $table->string('website')->nullable();

            // File uploads — stored as paths
            $table->string('clinic_photo_path')->nullable();      // Photo of physical clinic
            $table->string('mdcn_cert_photo_path')->nullable();   // Photo of MDCN certificate
            $table->json('portfolio_photos')->nullable();          // 3-5 before/after photos
            $table->string('lsmoh_cert_photo_path')->nullable();  // LSMOH certificate

            // Services offered
            $table->json('selected_services');

            // Admin review — stricter, more options
            $table->enum('status', ['pending', 'under_review', 'approved', 'rejected', 'more_info_needed'])
                  ->default('pending')->index();
            $table->text('rejection_reason')->nullable();
            $table->text('admin_notes')->nullable();     // Internal notes, not shown to clinic
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beauty_registrations');
        Schema::dropIfExists('hospital_registrations');
    }
};