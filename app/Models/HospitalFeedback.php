<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HospitalFeedback extends Model
{
    protected $fillable = [
        'hospital_id', 'service_id', 'type', 'message',
        'rating', 'user_lat', 'user_lng', 'location_verified', 'device_fingerprint'
    ];

    protected $casts = [
        'location_verified' => 'boolean',
        'user_lat'          => 'double',
        'user_lng'          => 'double',
    ];

    public function hospital(): BelongsTo { return $this->belongsTo(Hospital::class); }
    public function service(): BelongsTo  { return $this->belongsTo(Service::class); }
}