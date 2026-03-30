<?php

namespace App\Http\Controllers;

use App\Models\HospitalFeedback;
use App\Models\Hospital;
use App\Models\Service;
use App\Models\OutbreakAlert;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class FeedbackController extends Controller
{
    /**
     * Submit GPS-locked feedback.
     * User must be within 500m of hospital — verified server-side.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'hospital_id'  => 'required|integer|exists:hospitals,id',
            'type'         => 'required|in:service_unavailable,wrong_info,great_service,other',
            'comment'      => 'nullable|string|max:500',
            'reporter_lat' => 'required|numeric|between:-90,90',
            'reporter_lng' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            $hospital = Hospital::findOrFail($request->hospital_id);

            // GPS LOCK — must be within 500 metres
            $distance = 6371 * acos(min(1.0,
                cos(deg2rad((float)$request->reporter_lat)) *
                cos(deg2rad((float)$hospital->lat)) *
                cos(deg2rad((float)$hospital->lng) - deg2rad((float)$request->reporter_lng)) +
                sin(deg2rad((float)$request->reporter_lat)) *
                sin(deg2rad((float)$hospital->lat))
            ));

            if ($distance > 0.5) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'You must be at the hospital to submit feedback. Your GPS shows you are too far away.',
                ], 403);
            }

            // Spam prevention — max 3 per hospital per hour from same location
            $recent = HospitalFeedback::where('hospital_id', $request->hospital_id)
                ->where('created_at', '>=', now()->subHour())
                ->where('reporter_lat', round((float)$request->reporter_lat, 3))
                ->count();

            if ($recent >= 3) {
                return response()->json(['status' => 'error', 'message' => 'Too many reports. Please wait before submitting again.'], 429);
            }

            HospitalFeedback::create([
                'hospital_id'  => $request->hospital_id,
                'type'         => $request->type,
                'comment'      => $request->comment
                    ? htmlspecialchars(strip_tags(trim($request->comment)), ENT_QUOTES, 'UTF-8')
                    : null,
                'reporter_lat' => round((float)$request->reporter_lat, 8),
                'reporter_lng' => round((float)$request->reporter_lng, 8),
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Thank you. Your feedback helps keep information accurate.',
            ]);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("FEEDBACK_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Could not submit feedback.', 'ref' => $ref], 500);
        }
    }

    /**
     * Get active outbreak alerts for the ticker.
     * Cached for 10 minutes — alerts don't change frequently.
     */
    public function alerts(): JsonResponse
    {
        $alerts = Cache::remember('outbreak_alerts', now()->addMinutes(10), function () {
            return OutbreakAlert::active()
                ->select(['id', 'title', 'message', 'severity'])
                ->orderByRaw("FIELD(severity,'critical','warning','info')")
                ->get();
        });

        return response()->json(['status' => 'success', 'data' => $alerts]);
    }
}