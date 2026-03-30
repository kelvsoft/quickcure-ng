<?php

namespace App\Http\Controllers;

use App\Models\BeautyLead;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BeautyLeadController extends Controller
{
    /**
     * Store a new aesthetics consultation lead.
     * REVENUE: This lead is sold to the verified surgeon.
     * LEGAL: consent field must be explicitly submitted as true.
     * SECURITY: All text input sanitized. Phone normalized to digits only.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'hospital_id' => 'required|integer|exists:hospitals,id',
            'procedure'   => 'required|string|max:100',
            'timeline'    => 'nullable|string|max:50',
            // 'name' matches what LeadCaptureModal sends
            'name'        => 'required|string|max:100',
            'phone'       => 'required|string|max:20',
            'notes'       => 'nullable|string|max:500',
            // Photo upload — optional, max 5MB, images only
            'photo'       => 'nullable|file|mimes:jpeg,png,jpg|max:5120',
            // LEGAL: User must have explicitly ticked the consent box
            'consented'   => 'required|accepted',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            // Handle optional photo upload
            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $request->file('photo')->store('leads/photos', 'public');
            }

            BeautyLead::create([
                'hospital_id'   => $request->hospital_id,
                'procedure'     => htmlspecialchars(strip_tags(trim($request->procedure)), ENT_QUOTES, 'UTF-8'),
                'timeline'      => $request->timeline,
                'full_name'     => htmlspecialchars(strip_tags(trim($request->name)), ENT_QUOTES, 'UTF-8'),
                'phone'         => preg_replace('/[^0-9+]/', '', $request->phone),
                'notes'         => $request->notes
                    ? htmlspecialchars(strip_tags(trim($request->notes)), ENT_QUOTES, 'UTF-8')
                    : null,
                'photo_path'    => $photoPath,
                'consent_given' => true,
                'ip_address'    => $request->ip(),
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Your consultation request has been sent. The clinic will contact you within 24 hours.',
            ]);

        } catch (\Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("LEAD_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Could not submit your request. Please try again.',
                'ref'     => $ref,
            ], 500);
        }
    }
}