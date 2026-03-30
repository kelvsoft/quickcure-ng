<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutbreakAlert extends Model
{
    protected $fillable = ['title', 'message', 'severity', 'state', 'is_active', 'expires_at'];
    protected $casts    = ['is_active' => 'boolean', 'expires_at' => 'datetime'];

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                     ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}