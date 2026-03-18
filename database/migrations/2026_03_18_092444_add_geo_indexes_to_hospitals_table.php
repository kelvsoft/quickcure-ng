<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            // This is the "Magic Marker" that makes location searches instant
            $table->index(['lat', 'lng'], 'hospitals_geo_index');

            // Also add one for is_verified if it's not in your list
            $table->index('is_verified', 'hospitals_verified_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            //
        });
    }
};
