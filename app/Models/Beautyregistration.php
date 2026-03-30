<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BeautyRegistration extends Model
{
    protected $fillable = [
        'clinic_name','address','state','lga','lat','lng',
        'surgeon_name','surgeon_mdcn','lsmoh_license',
        'specialty_board','years_experience','procedures_performed',
        'whatsapp_number','email','instagram','website',
        'clinic_photo_path','mdcn_cert_photo_path',
        'portfolio_photos','lsmoh_cert_photo_path',
        'selected_services',
        'status','rejection_reason','admin_notes',
        'reviewed_at','reviewed_by',
    ];

    protected $casts = [
        'selected_services'  => 'array',
        'portfolio_photos'   => 'array',
        'reviewed_at'        => 'datetime',
    ];

    // Never expose license numbers or admin notes in public API
    protected $hidden = ['surgeon_mdcn','lsmoh_license','admin_notes'];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending($query)     { return $query->where('status', 'pending'); }
    public function scopeUnderReview($query) { return $query->where('status', 'under_review'); }
    public function scopeApproved($query)    { return $query->where('status', 'approved'); }
    public function scopeNeedsInfo($query)   { return $query->where('status', 'more_info_needed'); }
}