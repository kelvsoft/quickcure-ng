<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HospitalRegistration extends Model
{
    protected $fillable = [
        'hospital_name','address','state','lga','lat','lng',
        'whatsapp_number','email','contact_person',
        'mdcn_license','cac_number','selected_services',
        'status','rejection_reason','reviewed_at','reviewed_by',
    ];

    protected $casts = [
        'selected_services' => 'array',
        'reviewed_at'       => 'datetime',
    ];

    // Never expose license numbers in API responses
    protected $hidden = ['mdcn_license','cac_number'];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending($query)  { return $query->where('status', 'pending'); }
    public function scopeApproved($query) { return $query->where('status', 'approved'); }
}