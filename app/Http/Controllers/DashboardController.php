<?php

namespace App\Http\Controllers;

use App\Models\Hospital;
use Inertia\Inertia;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        // 1. Fetch only necessary columns for better performance (Indexing for Speed)
        // 2. Use a Map to transform data into a "Clean" format
        $hospitals = Hospital::select('id', 'name', 'address', 'email', 'status')
            ->latest()
            ->get()
            ->map(function ($hospital) {
                return [
                    'id' => $hospital->id,
                    'name' => $hospital->name,
                    'address' => $hospital->address,
                    'email' => $hospital->email,
                    'status' => $hospital->status,
                    'can_update' => true, // Permission logic can go here
                ];
            });

        return Inertia::render('Dashboard', [
            'hospitals' => $hospitals,
            'stats' => [
                'total' => $hospitals->count(),
                'available' => $hospitals->where('status', 'available')->count(),
            ]
        ]);
    }
}