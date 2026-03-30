<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('outbreak_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('message');
            $table->enum('severity', ['info', 'warning', 'critical'])->default('warning');
            $table->string('state')->nullable();      // e.g. "Lagos" — null means nationwide
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('hospital_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['service_unavailable', 'wrong_info', 'great_service', 'other']);
            $table->text('comment')->nullable();
            $table->decimal('reporter_lat', 11, 8);
            $table->decimal('reporter_lng', 11, 8);
            $table->boolean('is_reviewed')->default(false)->index();
            $table->timestamps();
            $table->index(['hospital_id', 'created_at']);
        });

        Schema::create('beauty_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hospital_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->string('procedure');
            $table->string('timeline')->nullable();
            $table->text('notes')->nullable();
            $table->string('photo_path')->nullable();
            $table->boolean('consent_given')->default(false);
            $table->boolean('is_contacted')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beauty_leads');
        Schema::dropIfExists('hospital_feedback');
        Schema::dropIfExists('outbreak_alerts');
    }
};