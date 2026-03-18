<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HospitalUpdateToken extends Model
{
    protected $fillable = [
        'hospital_id',
        'service_id',
        'token',
        'intended_status',
        'expires_at',
        'used_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
    ];

    // Never expose the raw token hash in any API response
    protected $hidden = ['token'];

    // =========================================================
    // RELATIONSHIPS
    // =========================================================

    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    /**
     * A token is only valid if it has never been used AND has not expired.
     * Both conditions must be true — one is not enough.
     */
    public function isValid(): bool
    {
        return is_null($this->used_at) && $this->expires_at->isFuture();
    }
}