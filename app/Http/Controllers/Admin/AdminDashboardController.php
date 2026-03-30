<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hospital;
use App\Models\Service;
use App\Models\OutbreakAlert;
use App\Models\HospitalRegistration;
use App\Models\BeautyRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $hospitals = Hospital::with(['services' => fn($q) => $q->select([
            'id','hospital_id','service_name','status','category','price'
        ])])
        ->select(['id','name','slug','address','phone','whatsapp_number','is_verified','tier','lat','lng'])
        ->orderBy('is_verified')->orderBy('name')
        ->get();

        $stats = Cache::remember('admin_stats', now()->addMinutes(2), function () {
            return [
                'total'          => Hospital::count(),
                'verified'       => Hospital::where('is_verified', true)->count(),
                'unverified'     => Hospital::where('is_verified', false)->count(),
                'premium'        => Hospital::where('is_premium', true)->count(),
                'activeServices' => Service::where('status', 'available')->count(),
                'totalServices'  => Service::count(),
            ];
        });

        $alerts = OutbreakAlert::active()
            ->select(['id','title','message','severity','state'])
            ->orderByRaw("FIELD(severity,'critical','warning','info')")
            ->get();

        // Pending emergency registrations — fast queue
        $pendingEmergency = HospitalRegistration::pending()
            ->select(['id','hospital_name','state','whatsapp_number','email','mdcn_license','selected_services','created_at'])
            ->orderBy('created_at')
            ->get();

        // Pending beauty registrations — strict queue
        $pendingBeauty = BeautyRegistration::where('status', 'pending')
            ->orWhere('status', 'under_review')
            ->select(['id','clinic_name','surgeon_name','state','whatsapp_number','surgeon_mdcn','lsmoh_license','status','portfolio_photos','clinic_photo_path','mdcn_cert_photo_path','selected_services','years_experience','procedures_performed','created_at'])
            ->orderBy('created_at')
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'hospitals'        => $hospitals,
            'stats'            => $stats,
            'alerts'           => $alerts,
            'pendingEmergency' => $pendingEmergency,
            'pendingBeauty'    => $pendingBeauty,
        ]);
    }

    public function verify(Request $request, Hospital $hospital)
    {
        $hospital->update(['is_verified' => true]);
        Cache::forget('admin_stats');
        return back()->with('success', "{$hospital->name} verified.");
    }

    /**
     * APPROVE EMERGENCY REGISTRATION
     * Creates hospital + services automatically from selected_services list
     */
    public function approveEmergency(Request $request, HospitalRegistration $registration)
    {
        try {
            DB::transaction(function () use ($registration) {
                // Create the hospital
                $hospital = Hospital::create([
                    'name'             => $registration->hospital_name,
                    'slug'             => $this->generateSlug($registration->hospital_name),
                    'email'            => $registration->email,
                    'phone'            => $registration->whatsapp_number,
                    'whatsapp_number'  => $registration->whatsapp_number,
                    'address'          => $registration->address,
                    'lat'              => $registration->lat ?? 6.5244, // Default Lagos if no GPS
                    'lng'              => $registration->lng ?? 3.3792,
                    'is_verified'      => true,
                    'is_premium'       => false,
                    'tier'             => 'basic',
                ]);

                // Create a service row for each selected service
                // Uses their existing services table structure
                $serviceMap = app(\App\Http\Controllers\HospitalRegistrationController::class)::EMERGENCY_SERVICES;
                $serviceMap = collect($serviceMap)->keyBy('id');

                foreach ($registration->selected_services as $serviceId) {
                    $svcInfo = $serviceMap[$serviceId] ?? null;
                    if (!$svcInfo) continue;

                    Service::create([
                        'hospital_id'  => $hospital->id,
                        'service_name' => $svcInfo['name'],
                        'category'     => $svcInfo['category'],
                        'status'       => 'none', // Default to none — hospital updates to available
                        'is_verified'  => true,
                        'current_stock'=> 0,
                    ]);
                }

                // Mark registration as approved
                $registration->update([
                    'status'      => 'approved',
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ]);

                Cache::forget('admin_stats');
            });

            return back()->with('success', "Hospital approved and created successfully.");

        } catch (\Exception $e) {
            Log::error("APPROVE_EMERGENCY_FAILURE: " . $e->getMessage());
            return back()->with('error', 'Approval failed. Please try again.');
        }
    }

    /**
     * APPROVE BEAUTY REGISTRATION
     * Creates hospital entry with aesthetics tier
     */
    public function approveBeauty(Request $request, BeautyRegistration $registration)
    {
        try {
            DB::transaction(function () use ($registration) {
                $hospital = Hospital::create([
                    'name'             => $registration->clinic_name,
                    'slug'             => $this->generateSlug($registration->clinic_name),
                    'email'            => $registration->email,
                    'phone'            => $registration->whatsapp_number,
                    'whatsapp_number'  => $registration->whatsapp_number,
                    'address'          => $registration->address,
                    'lat'              => $registration->lat ?? 6.5244,
                    'lng'              => $registration->lng ?? 3.3792,
                    'is_verified'      => true,
                    'is_premium'       => false,
                    'tier'             => 'basic',
                ]);

                $serviceMap = app(\App\Http\Controllers\HospitalRegistrationController::class)::BEAUTY_SERVICES;
                $serviceMap = collect($serviceMap)->keyBy('id');

                foreach ($registration->selected_services as $serviceId) {
                    $svcInfo = $serviceMap[$serviceId] ?? null;
                    if (!$svcInfo) continue;

                    Service::create([
                        'hospital_id'  => $hospital->id,
                        'service_name' => $svcInfo['name'],
                        'category'     => $svcInfo['category'],
                        'status'       => 'available', // Beauty clinics default to available
                        'is_verified'  => true,
                        'current_stock'=> 1,
                    ]);
                }

                $registration->update([
                    'status'      => 'approved',
                    'reviewed_at' => now(),
                    'reviewed_by' => auth()->id(),
                ]);

                Cache::forget('admin_stats');
            });

            return back()->with('success', "Beauty clinic approved successfully.");

        } catch (\Exception $e) {
            Log::error("APPROVE_BEAUTY_FAILURE: " . $e->getMessage());
            return back()->with('error', 'Approval failed. Please try again.');
        }
    }

    public function rejectEmergency(Request $request, HospitalRegistration $registration)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $registration->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
            'reviewed_at'      => now(),
            'reviewed_by'      => auth()->id(),
        ]);
        return back()->with('success', 'Registration rejected.');
    }

    public function rejectBeauty(Request $request, BeautyRegistration $registration)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $registration->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
            'reviewed_at'      => now(),
            'reviewed_by'      => auth()->id(),
        ]);
        return back()->with('success', 'Application rejected.');
    }

    public function markBeautyUnderReview(BeautyRegistration $registration)
    {
        $registration->update(['status' => 'under_review']);
        return back()->with('success', 'Marked as under review.');
    }

    public function storeAlert(Request $request)
    {
        $request->validate([
            'title'    => 'required|string|max:100',
            'message'  => 'required|string|max:300',
            'severity' => 'required|in:info,warning,critical',
            'state'    => 'nullable|string|max:50',
        ]);

        OutbreakAlert::create([
            'title'     => htmlspecialchars(strip_tags($request->title), ENT_QUOTES, 'UTF-8'),
            'message'   => htmlspecialchars(strip_tags($request->message), ENT_QUOTES, 'UTF-8'),
            'severity'  => $request->severity,
            'state'     => $request->state ? htmlspecialchars(strip_tags($request->state)) : null,
            'is_active' => true,
        ]);

        Cache::forget('outbreak_alerts');
        return back()->with('success', 'Alert published.');
    }

    public function deleteAlert(OutbreakAlert $alert)
    {
        $alert->delete();
        Cache::forget('outbreak_alerts');
        return back()->with('success', 'Alert removed.');
    }

    private function generateSlug(string $name): string
    {
        $attempts = 0;
        do {
            if (++$attempts > 10) throw new \RuntimeException("Could not generate unique slug.");
            $slug = Str::slug($name) . '-' . Str::lower(Str::random(6));
        } while (Hospital::where('slug', $slug)->exists());
        return $slug;
    }
}