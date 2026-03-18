<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // 1. HOSPITALS TABLE
        Schema::create('hospitals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique()->index(); // INDEXED for ultra-fast searching
            $table->string('email')->unique();
            $table->string('phone')->unique();
            $table->string('whatsapp_number')->nullable()->unique(); // NEW: For Magic Link communication
            $table->text('address');
            
            // Spatial Data for Geofencing (using high precision)
            $table->decimal('lat', 11, 8);
            $table->decimal('lng', 11, 8);
            
            // Monetization & Trust
            $table->boolean('is_premium')->default(false)->index(); // Indexed for filtering
            $table->boolean('is_verified')->default(false);
            $table->enum('tier', ['basic', 'silver', 'gold'])->default('basic');
            
            $table->timestamps();
        });

        // 2. SERVICES TABLE
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            // Foreign Key: Securely links to a hospital
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            
            $table->string('service_name')->index(); // Indexed for search engine speed
            $table->string('category')->index(); // e.g., 'emergency'
            
            // Status & Inventory
            $table->enum('status', ['available', 'low', 'none'])->default('none')->index();
            $table->integer('current_stock')->default(0);
            $table->decimal('price', 15, 2)->nullable();
            
            // Verification & Cash Inflow
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_verified')->default(true);
            $table->integer('report_count')->default(0);
            $table->string('restock_url')->nullable();
            
            // Tracking for Geofence Audit Trail
            $table->decimal('update_lat', 11, 8)->nullable();
            $table->decimal('update_lng', 11, 8)->nullable();
            $table->timestamp('last_confirmed_at')->nullable();
            
            $table->timestamps();
        });

        // 3. SECURE UPDATE TOKENS: For the Magic Link system
        Schema::create('hospital_update_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique(); // The secure cryptographic string
            
            // Security: Link the token to a specific service update
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->string('intended_status'); // 'available', 'none', etc.
            
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            
            // Indexing for Speed: We will search by token constantly
            $table->index('token');
        });
    }

    public function down(): void {
        Schema::dropIfExists('hospital_update_tokens');
        Schema::dropIfExists('services');
        Schema::dropIfExists('hospitals');
    }
};