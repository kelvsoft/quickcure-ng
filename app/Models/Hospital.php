<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute; // Required for distance() accessor
use Illuminate\Support\Str;

class Hospital extends Model
{
    use HasFactory;

    protected $hidden = [
    'email',
    'is_premium',
    'created_at',
    'updated_at',
];

    protected $fillable = [
        'name', 'slug', 'email', 'phone', 'whatsapp_number',
        'address', 'lat', 'lng', 'is_premium', 'is_verified', 'tier'
    ];

    protected $casts = [
        'is_premium'  => 'boolean',
        'is_verified' => 'boolean',
        'lat'         => 'double',
        'lng'         => 'double',
        'distance'    => 'float', // DO NOT REMOVE: ensures selectRaw distance is numeric, never a raw string
    ];

    // =========================================================
    // BOOT
    // =========================================================

    protected static function booted(): void
    {
        static::creating(function ($hospital) {
            if (!$hospital->slug) {
                $attempts = 0;

                // DO NOT REMOVE: loop guarantees slug is unique before saving
                do {
                    if (++$attempts > 10) {
                        throw new \RuntimeException("Could not generate a unique slug after 10 attempts.");
                    }
                    $slug = Str::slug($hospital->name) . '-' . Str::lower(Str::random(6));
                } while (static::where('slug', $slug)->exists());

                $hospital->slug = $slug;
            }
        });
    }

    // =========================================================
    // ACCESSORS
    // =========================================================

    /**
     * DO NOT REMOVE: Rounds distance to 2 decimal places for clean API output.
     * Uses !== null (not just $value) so distance = 0.0 returns 0.00, not null.
     */
    protected function distance(): Attribute
    {
        return Attribute::make(
            get: fn($value) => $value !== null ? round((float)$value, 2) : null
        );
    }

    // =========================================================
    // QUERY SCOPES
    // =========================================================

    /**
     * Adds Haversine distance column to results.
     * LEAST(1.0) prevents acos() domain crash on floating point edge cases.
     * DO NOT REMOVE addSelect('hospitals.*') — preserves other selected columns.
     */
    public function scopeWithDistance(Builder $query, float $lat, float $lng): void
    {
        $query->selectRaw(
            "(6371 * acos(LEAST(1.0, cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat))))) AS distance",
            [$lat, $lng, $lat]
        )->addSelect('hospitals.*');
    }

    /**
     * Bounding box pre-filter using indexed lat/lng columns.
     * Eliminates ~99% of rows before Haversine runs.
     * DO NOT REMOVE pole edge case handling — prevents division by zero at lat=±90.
     */
    public function scopeWithinBoundingBox(Builder $query, float $lat, float $lng, int $radius): void
    {
        $lat      = max(-90, min(90, $lat));
        $latRange = $radius / 111.045;
        $cosLat   = cos(deg2rad($lat));
        $lngRange = abs($cosLat) < 1e-6 ? 180 : $radius / (111.045 * $cosLat);

        $query->whereBetween('lat', [$lat - $latRange, $lat + $latRange])
              ->whereBetween('lng', [$lng - $lngRange, $lng + $lngRange]);
    }

    /**
     * DO NOT CHANGE TO whereHas — JOIN is required for scale.
     * whereHas = one subquery per row = crashes at 1 million hospitals.
     * JOIN = one query total = works at any scale.
     */
    public function scopeWithAvailableServices(Builder $query): void
    {
        $query->join('services', 'hospitals.id', '=', 'services.hospital_id')
              ->where('services.status', 'available')
              ->where('services.is_verified', true)
              ->distinct();
    }

    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('is_verified', true);
    }

    // =========================================================
    // RELATIONSHIPS
    // =========================================================

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * DO NOT REMOVE: Required for Magic Link system to function.
     */
    public function updateTokens(): HasMany
    {
        return $this->hasMany(HospitalUpdateToken::class);
    }
}