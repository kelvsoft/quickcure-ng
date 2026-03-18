<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'hospital_id',
        'service_name',
        'category', 
        'status',   
        'current_stock',
        'price',
        'last_confirmed_at',
        'is_featured', 
        'update_lat',  
        'update_lng',
        'report_count', 
        'is_verified',
        'restock_url' // NEW: For the "Click here to buy" Cash Inflow!
    ];

    protected $casts = [
        'last_confirmed_at' => 'datetime',
        'price' => 'decimal:2',
        'is_featured' => 'boolean',
        'is_verified' => 'boolean',
        'report_count' => 'integer',
    ];

    /**
     * Relationship: BelongsTo Relationship
     */
    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    /**
     * Real-World Standard: Query Scope
     * English Term: Filtered Result Set
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', '!=', 'none')
                     ->where('is_verified', true);
    }

    /**
     * Business Logic: Should we show the restock ad?
     * English Term: Conditional Rendering Logic
     */
    public function needsRestock(): bool
    {
        return $this->status === 'none' || $this->status === 'low';
    }
}