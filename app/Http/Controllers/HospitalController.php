<?php

namespace App\Http\Controllers;

use App\Models\Hospital;
use App\Services\SmartSearchService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class HospitalController extends Controller
{
    public function __construct(private SmartSearchService $search) {}

    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius'    => 'nullable|integer|min:1|max:50',
            'page'      => 'nullable|integer|min:1|max:100',
            'service'   => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 400);
        }

        $lat        = round((float)$request->latitude, 3);
        $lng        = round((float)$request->longitude, 3);
        $radius     = (int)($request->radius ?? 15);
        $page       = (int)($request->page ?? 1);
        $rawService = $request->service
            ? substr(strip_tags(trim($request->service)), 0, 100)
            : null;

        $searchTerms = $rawService ? $this->search->resolve($rawService) : [];
        $track       = $rawService ? $this->search->detectTrack($rawService) : 'emergency';

        $cacheKey = 'hosp_v3_' . md5("{$lat}_{$lng}_{$radius}_p{$page}_" . implode(',', $searchTerms));

        try {
            $hospitals = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($lat, $lng, $radius, $searchTerms) {
                $query = Hospital::query()
                    ->select([
                        'hospitals.id','hospitals.name','hospitals.slug',
                        'hospitals.address','hospitals.phone','hospitals.whatsapp_number',
                        'hospitals.lat','hospitals.lng','hospitals.is_verified','hospitals.tier',
                    ])
                    ->withDistance($lat, $lng)
                    ->withinBoundingBox($lat, $lng, $radius)
                    ->join('services', 'hospitals.id', '=', 'services.hospital_id')
                    ->where('services.status', 'available')
                    ->where('services.is_verified', true);

                // OR search across all resolved terms
                if (!empty($searchTerms)) {
                    $query->where(function ($q) use ($searchTerms) {
                        foreach ($searchTerms as $term) {
                            $q->orWhere('services.service_name', 'LIKE', '%' . $term . '%')
                              ->orWhere('services.category', 'LIKE', '%' . $term . '%');
                        }
                    });
                }

                return $query
                    ->distinct()
                    ->with(['services' => fn($q) => $q
                        ->where('status', 'available')
                        ->where('is_verified', true)
                        ->when(!empty($searchTerms), fn($q) => $q->where(function ($sq) use ($searchTerms) {
                            foreach ($searchTerms as $term) {
                                $sq->orWhere('service_name', 'LIKE', '%' . $term . '%')
                                   ->orWhere('category', 'LIKE', '%' . $term . '%');
                            }
                        }))
                        ->select(['id','hospital_id','service_name','status','current_stock','price','category','last_confirmed_at'])
                    ])
                    ->having('distance', '<=', $radius)
                    ->orderBy('distance')
                    ->simplePaginate(15);
            });

            return response()->json([
                'status' => 'success',
                'data'   => $hospitals,
                'meta'   => [
                    'resolved_terms' => $searchTerms,
                    'track'          => $track,
                    'original_query' => $rawService,
                ],
            ]);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::critical("SEARCH_FAILURE [{$ref}]", ['message' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
            return response()->json(['status' => 'error', 'message' => 'Service temporarily busy.', 'ref' => $ref], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'    => 'required|string|max:100',
            'email'   => 'required|email:rfc,dns|max:100|unique:hospitals,email',
            'phone'   => 'required|string|max:20|unique:hospitals,phone',
            'address' => 'required|string|max:300',
            'lat'     => 'required|numeric|between:-90,90',
            'lng'     => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            do {
                $slug = Str::slug($request->name) . '-' . Str::lower(Str::random(6));
            } while (Hospital::where('slug', $slug)->exists());

            $hospital              = new Hospital();
            $hospital->name        = htmlspecialchars(strip_tags(trim($request->name)), ENT_QUOTES, 'UTF-8');
            $hospital->email       = strtolower(trim($request->email));
            $hospital->phone       = preg_replace('/[^0-9]/', '', $request->phone);
            $hospital->address     = htmlspecialchars(strip_tags(trim($request->address)), ENT_QUOTES, 'UTF-8');
            $hospital->lat         = round((float)$request->lat, 8);
            $hospital->lng         = round((float)$request->lng, 8);
            $hospital->slug        = $slug;
            $hospital->is_verified = false;
            $hospital->tier        = 'basic';
            $hospital->is_premium  = false;
            $hospital->save();

            return response()->json([
                'status'  => 'success',
                'message' => 'Hospital registered. Pending admin verification.',
                'data'    => ['id' => $hospital->id, 'name' => $hospital->name, 'slug' => $hospital->slug],
            ], 201);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("REGISTRATION_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Registration failed.', 'ref' => $ref], 500);
        }
    }
}