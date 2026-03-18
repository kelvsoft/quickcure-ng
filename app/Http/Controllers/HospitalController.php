<?php

namespace App\Http\Controllers;

use App\Models\Hospital;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class HospitalController extends Controller
{
    // =========================================================
    // SEARCH — Optimized for millions of concurrent users
    // =========================================================

    public function index(Request $request): JsonResponse
    {
        // LAYER 1: Strict input validation — reject garbage before it touches the DB
        $validator = Validator::make($request->all(), [
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius'    => 'nullable|integer|min:1|max:50',
            'page'      => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 400);
        }

        // LAYER 2: Round coordinates to 3 decimal places (~100m precision).
        // This dramatically increases cache hit rate — 10,000 users in the same
        // area all share the same cache key instead of each getting their own.
        $lat    = round((float)$request->latitude, 3);
        $lng    = round((float)$request->longitude, 3);
        $radius = (int)($request->radius ?? 15);
        $page   = (int)($request->page ?? 1);

        $cacheKey = "hosp_v2_{$lat}_{$lng}_{$radius}_p{$page}";

        try {
            // LAYER 3: Redis cache — first user hits the DB, the next 100,000 get RAM.
            $hospitals = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($lat, $lng, $radius) {
                return Hospital::query()
                    // Only select what we need — never SELECT *
                    ->select([
                        'hospitals.id',
                        'hospitals.name',
                        'hospitals.slug',
                        'hospitals.address',
                        'hospitals.phone',
                        'hospitals.whatsapp_number',
                        'hospitals.lat',
                        'hospitals.lng',
                        'hospitals.is_verified',
                        'hospitals.tier',
                    ])
                    // LAYER 4: Haversine distance formula with LEAST() to prevent
                    // acos() domain errors on floating point edge cases (would crash without it)
                    ->withDistance($lat, $lng)
                    // LAYER 5: Bounding box uses lat/lng indexes — eliminates 99% of rows
                    // BEFORE the expensive Haversine math runs
                    ->withinBoundingBox($lat, $lng, $radius)
                    // LAYER 6: JOIN instead of whereHas — single query, uses indexes,
                    // no correlated subquery per row
                    ->withAvailableServices()
                    // LAYER 7: Eager load services to prevent N+1 query problem.
                    // Without this: 15 hospitals = 15 extra queries. With this: 1 extra query.
                    ->with(['services' => fn($q) => $q
                        ->where('status', 'available')
                        ->where('is_verified', true)
                        ->select(['hospital_id', 'service_name', 'status', 'current_stock', 'price', 'category'])
                    ])
                    // LAYER 8: Final precise distance filter after bounding box pre-filter
                    ->having('distance', '<=', $radius)
                    ->orderBy('distance')
                    // LAYER 9: simplePaginate skips COUNT(*) — critical for large tables
                    ->simplePaginate(15);
            });

            return response()->json([
                'status' => 'success',
                'data'   => $hospitals,
            ]);

        } catch (Exception $e) {
            // Never expose internal errors to users — log privately, return generic message
            $ref = Str::upper(Str::random(8));
            Log::critical("SEARCH_FAILURE [{$ref}]", [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Service temporarily busy. Please try again.',
                'ref'     => $ref, // User can report this ref to support
            ], 500);
        }
    }

    // =========================================================
    // REGISTRATION — High-security hospital onboarding
    // =========================================================

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'    => 'required|string|max:100',
            // email:rfc,dns validates the domain actually exists — stops fake emails
            'email'   => 'required|email:rfc,dns|max:100|unique:hospitals,email',
            'phone'   => 'required|string|max:20|unique:hospitals,phone',
            'address' => 'required|string|max:300',
            'lat'     => 'required|numeric|between:-90,90',
            'lng'     => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Guaranteed unique slug — loop until we find one that doesn't exist
            do {
                $slug = Str::slug($request->name) . '-' . Str::lower(Str::random(6));
            } while (Hospital::where('slug', $slug)->exists());

            $hospital = new Hospital();
            // htmlspecialchars + strip_tags + trim = full XSS prevention chain
            $hospital->name        = htmlspecialchars(strip_tags(trim($request->name)), ENT_QUOTES, 'UTF-8');
            $hospital->email       = strtolower(trim($request->email));
            $hospital->phone       = preg_replace('/[^0-9]/', '', $request->phone);
            $hospital->address     = htmlspecialchars(strip_tags(trim($request->address)), ENT_QUOTES, 'UTF-8');
            $hospital->lat         = round((float)$request->lat, 8);
            $hospital->lng         = round((float)$request->lng, 8);
            $hospital->slug        = $slug;
            $hospital->is_verified = false; // SECURITY: Admin must manually verify every hospital
            $hospital->tier        = 'basic';
            $hospital->is_premium  = false;
            $hospital->save();

            // Return minimal data — never return the full model to public API
            return response()->json([
                'status'  => 'success',
                'message' => 'Hospital registered. Pending admin verification.',
                'data'    => [
                    'id'   => $hospital->id,
                    'name' => $hospital->name,
                    'slug' => $hospital->slug,
                ],
            ], 201);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("REGISTRATION_FAILURE [{$ref}]: " . $e->getMessage());

            return response()->json([
                'status'  => 'error',
                'message' => 'Registration failed. Please try again.',
                'ref'     => $ref,
            ], 500);
        }
    }
}

