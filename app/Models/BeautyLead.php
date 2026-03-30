<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BeautyLead extends Model
{
    protected $fillable = [
        'hospital_id', 'procedure', 'full_name', 'phone',
        'email', 'budget', 'timeline', 'notes', 'consent_given', 'ip_address'
    ];

    protected $casts = [
        'consent_given' => 'boolean',
    ];

    // SECURITY: Never expose PII in API responses
    protected $hidden = ['ip_address', 'created_at', 'updated_at'];

    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }
}