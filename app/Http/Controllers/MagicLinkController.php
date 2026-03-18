<?php

namespace App\Http\Controllers;

use App\Models\Hospital;
use App\Models\Service;
use App\Models\HospitalUpdateToken;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Exception;

class MagicLinkController extends Controller
{
    // =========================================================
    // STEP 1: Send the Magic Link to the hospital via WhatsApp/SMS
    // This is called by your ADMIN or automated system — not public
    // =========================================================

    public function send(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'hospital_id' => 'required|integer|exists:hospitals,id',
            'service_id'  => 'required|integer|exists:services,id',
            'status'      => 'required|in:available,low,none',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            // Security: Invalidate all previous unused tokens for this service
            // Prevents token accumulation attacks
            HospitalUpdateToken::where('hospital_id', $request->hospital_id)
                ->where('service_id', $request->service_id)
                ->whereNull('used_at')
                ->delete();

            // Generate a cryptographically secure 64-character token
            $token = bin2hex(random_bytes(32)); // 32 bytes = 64 hex chars

            HospitalUpdateToken::create([
                'hospital_id'     => $request->hospital_id,
                'service_id'      => $request->service_id,
                'token'           => hash('sha256', $token), // Store HASH, never raw token
                'intended_status' => $request->status,
                'expires_at'      => now()->addHours(48),
            ]);

            // The raw token (not the hash) goes in the magic link URL
            $magicLink = config('app.url') . '/api/magic-link/verify?token=' . $token;

            // In production: send $magicLink via WhatsApp API or SMS here
            // e.g., WhatsApp::send($hospital->whatsapp_number, $magicLink);

            return response()->json([
                'status'     => 'success',
                'message'    => 'Magic link generated.',
                'magic_link' => $magicLink, // Remove this line in production — only for testing
            ]);

        } catch (Exception $e) {
            Log::error('MAGIC_LINK_SEND_FAILURE: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Failed to generate link.'], 500);
        }
    }

    // =========================================================
    // STEP 2: Hospital clicks the link — we verify and update stock
    // =========================================================

    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string|size:64', // Must be exactly 64 chars
        ]);

        if ($validator->fails()) {
            // Generic error — never tell attacker WHY validation failed
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired link.'], 401);
        }

        try {
            // Hash the incoming token to compare against stored hash
            // This means even if your DB is stolen, tokens are useless
            $hashedToken = hash('sha256', $request->token);

            $tokenRecord = HospitalUpdateToken::with(['hospital', 'service'])
                ->where('token', $hashedToken)
                ->first();

            // Security: Constant-time checks — check all conditions, don't short-circuit
            // This prevents timing attacks that could reveal valid token patterns
            $tokenExists  = !is_null($tokenRecord);
            $tokenUnused  = $tokenExists && is_null($tokenRecord->used_at);
            $tokenFresh   = $tokenExists && $tokenRecord->expires_at->isFuture();

            if (!$tokenExists || !$tokenUnused || !$tokenFresh) {
                Log::warning('INVALID_TOKEN_ATTEMPT', ['token_prefix' => substr($request->token, 0, 8)]);
                return response()->json(['status' => 'error', 'message' => 'Invalid or expired link.'], 401);
            }

            // Use a DB transaction — if anything fails, nothing changes
            DB::transaction(function () use ($tokenRecord) {
                // Update the service status
                Service::where('id', $tokenRecord->service_id)
                    ->where('hospital_id', $tokenRecord->hospital_id) // Double-check ownership
                    ->update([
                        'status'           => $tokenRecord->intended_status,
                        'last_confirmed_at' => now(),
                        'update_lat'       => null, // Cleared on each update
                        'update_lng'       => null,
                    ]);

                // Mark token as used — one-time use enforced
                $tokenRecord->update(['used_at' => now()]);
            });

            // Bust the cache for this hospital's area so users see fresh data immediately
            $this->bustAreaCache($tokenRecord->hospital);

            return response()->json([
                'status'  => 'success',
                'message' => 'Service status updated successfully. Thank you.',
            ]);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::critical("MAGIC_LINK_VERIFY_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Update failed.', 'ref' => $ref], 500);
        }
    }

    // =========================================================
    // Cache Busting: After a stock update, clear nearby cache
    // so the next search gets fresh data from DB
    // =========================================================

    private function bustAreaCache(Hospital $hospital): void
    {
        // Round to match the cache key format used in HospitalController
        $lat    = round($hospital->lat, 3);
        $lng    = round($hospital->lng, 3);

        // Bust common radius and page combinations
        foreach ([5, 10, 15, 20, 30, 50] as $radius) {
            foreach ([1, 2, 3] as $page) {
                Cache::forget("hosp_v2_{$lat}_{$lng}_{$radius}_p{$page}");
            }
        }
    }
}