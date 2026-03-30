<?php

namespace App\Http\Controllers;

use App\Models\HospitalRegistration;
use App\Models\BeautyRegistration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Exception;

class HospitalRegistrationController extends Controller
{
    // Master service list for emergency track
    // Hospitals select from this list during registration
    const EMERGENCY_SERVICES = [
        ['id' => 'antivenom',      'name' => 'Anti-Venom (Polyvalent)',  'category' => 'emergency'],
        ['id' => 'blood_o_pos',    'name' => 'Blood Bank (O+)',           'category' => 'blood_bank'],
        ['id' => 'blood_o_neg',    'name' => 'Blood Bank (O-)',           'category' => 'blood_bank'],
        ['id' => 'blood_a_pos',    'name' => 'Blood Bank (A+)',           'category' => 'blood_bank'],
        ['id' => 'blood_b_pos',    'name' => 'Blood Bank (B+)',           'category' => 'blood_bank'],
        ['id' => 'blood_ab',       'name' => 'Blood Bank (AB)',           'category' => 'blood_bank'],
        ['id' => 'icu_bed',        'name' => 'ICU Bed',                   'category' => 'critical_care'],
        ['id' => 'oxygen',         'name' => 'Oxygen Cylinder',           'category' => 'respiratory'],
        ['id' => 'ventilator',     'name' => 'Ventilator',                'category' => 'respiratory'],
        ['id' => 'emg_surgery',    'name' => 'Emergency Surgery',         'category' => 'surgery'],
        ['id' => 'dialysis',       'name' => 'Dialysis',                  'category' => 'renal'],
        ['id' => 'ct_scan',        'name' => 'CT Scan',                   'category' => 'diagnostics'],
        ['id' => 'mri',            'name' => 'MRI',                       'category' => 'diagnostics'],
        ['id' => 'xray',           'name' => 'X-Ray',                     'category' => 'diagnostics'],
        ['id' => 'ultrasound',     'name' => 'Ultrasound',                'category' => 'diagnostics'],
        ['id' => 'maternity',      'name' => 'Maternity / Labour Ward',   'category' => 'maternity'],
        ['id' => 'nicu',           'name' => 'Neonatal ICU (NICU)',       'category' => 'maternity'],
        ['id' => 'cardiac',        'name' => 'Cardiac Care Unit',         'category' => 'cardiology'],
        ['id' => 'stroke',         'name' => 'Stroke Unit',               'category' => 'neurology'],
        ['id' => 'burns',          'name' => 'Burns Unit',                'category' => 'emergency'],
        ['id' => 'psychiatric',    'name' => 'Psychiatric Emergency',     'category' => 'mental_health'],
    ];

    const BEAUTY_SERVICES = [
        ['id' => 'bbl',        'name' => 'BBL (Brazilian Butt Lift)',   'category' => 'body'],
        ['id' => 'lipo',       'name' => 'Liposuction',                 'category' => 'body'],
        ['id' => 'tummytuck',  'name' => 'Tummy Tuck',                  'category' => 'body'],
        ['id' => 'breast_aug', 'name' => 'Breast Augmentation',         'category' => 'body'],
        ['id' => 'hair_fue',   'name' => 'Hair Transplant (FUE)',       'category' => 'hair'],
        ['id' => 'rhinoplasty','name' => 'Rhinoplasty (Nose Job)',      'category' => 'facial'],
        ['id' => 'veneers',    'name' => 'Dental Veneers',              'category' => 'dental'],
        ['id' => 'implants',   'name' => 'Dental Implants',             'category' => 'dental'],
        ['id' => 'botox',      'name' => 'Botox',                       'category' => 'injectables'],
        ['id' => 'fillers',    'name' => 'Dermal Fillers',              'category' => 'injectables'],
        ['id' => 'laser',      'name' => 'Skin Laser Treatment',        'category' => 'skin'],
        ['id' => 'peel',       'name' => 'Chemical Peel',               'category' => 'skin'],
    ];

    // =========================================================
    // EMERGENCY TRACK — /register-hospital
    // =========================================================

    public function showEmergency(): Response
    {
        return Inertia::render('Hospital/Register', [
            'track'    => 'emergency',
            'services' => self::EMERGENCY_SERVICES,
        ]);
    }

    public function storeEmergency(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'hospital_name'     => 'required|string|max:150',
            'address'           => 'required|string|max:300',
            'state'             => 'required|string|max:50',
            'lga'               => 'nullable|string|max:100',
            'whatsapp_number'   => 'required|string|max:20|unique:hospital_registrations,whatsapp_number',
            'email'             => 'required|email|max:100|unique:hospital_registrations,email',
            'contact_person'    => 'required|string|max:100',
            'mdcn_license'      => 'required|string|max:50',
            'cac_number'        => 'nullable|string|max:50',
            'selected_services' => 'required|array|min:1',
            'consent'           => 'required|accepted',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            HospitalRegistration::create([
                'hospital_name'     => htmlspecialchars(strip_tags(trim($request->hospital_name)), ENT_QUOTES, 'UTF-8'),
                'address'           => htmlspecialchars(strip_tags(trim($request->address)), ENT_QUOTES, 'UTF-8'),
                'state'             => $request->state,
                'lga'               => $request->lga,
                'whatsapp_number'   => preg_replace('/[^0-9+]/', '', $request->whatsapp_number),
                'email'             => strtolower(trim($request->email)),
                'contact_person'    => htmlspecialchars(strip_tags(trim($request->contact_person)), ENT_QUOTES, 'UTF-8'),
                'mdcn_license'      => strtoupper(trim($request->mdcn_license)),
                'cac_number'        => $request->cac_number ? strtoupper(trim($request->cac_number)) : null,
                'selected_services' => $request->selected_services,
                'status'            => 'pending',
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Registration submitted. We will verify your MDCN license and contact you via WhatsApp within 48 hours.',
            ], 201);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("EMERGENCY_REG_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Registration failed. Please try again.', 'ref' => $ref], 500);
        }
    }

    // =========================================================
    // BEAUTY TRACK — /register-clinic
    // =========================================================

    public function showBeauty(): Response
    {
        return Inertia::render('Hospital/RegisterBeauty', [
            'track'    => 'aesthetics',
            'services' => self::BEAUTY_SERVICES,
        ]);
    }

    public function storeBeauty(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'clinic_name'         => 'required|string|max:150',
            'address'             => 'required|string|max:300',
            'state'               => 'required|string|max:50',
            'lga'                 => 'nullable|string|max:100',
            'surgeon_name'        => 'required|string|max:100',
            'surgeon_mdcn'        => 'required|string|max:50',  // Individual surgeon MDCN
            'lsmoh_license'       => 'nullable|string|max:50',
            'specialty_board'     => 'nullable|string|max:100',
            'years_experience'    => 'required|integer|min:1|max:60',
            'procedures_performed'=> 'required|integer|min:0',
            'whatsapp_number'     => 'required|string|max:20|unique:beauty_registrations,whatsapp_number',
            'email'               => 'required|email|max:100|unique:beauty_registrations,email',
            'instagram'           => 'nullable|string|max:100',
            'website'             => 'nullable|url|max:200',
            'selected_services'   => 'required|array|min:1',
            // File uploads — all required for beauty track
            'clinic_photo'        => 'required|image|max:5120',      // 5MB max
            'mdcn_cert_photo'     => 'required|image|max:5120',
            'portfolio_photos'    => 'required|array|min:3|max:5',
            'portfolio_photos.*'  => 'image|max:5120',
            'lsmoh_cert_photo'    => 'nullable|image|max:5120',
            'consent'             => 'required|accepted',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        try {
            // Store uploaded files securely — not publicly accessible by default
            $clinicPhotoPath  = $request->file('clinic_photo')->store('beauty-registrations/clinic', 'private');
            $mdcnCertPath     = $request->file('mdcn_cert_photo')->store('beauty-registrations/certs', 'private');
            $lsmohCertPath    = $request->hasFile('lsmoh_cert_photo')
                ? $request->file('lsmoh_cert_photo')->store('beauty-registrations/certs', 'private')
                : null;

            $portfolioPaths = [];
            foreach ($request->file('portfolio_photos') as $photo) {
                $portfolioPaths[] = $photo->store('beauty-registrations/portfolio', 'private');
            }

            BeautyRegistration::create([
                'clinic_name'          => htmlspecialchars(strip_tags(trim($request->clinic_name)), ENT_QUOTES, 'UTF-8'),
                'address'              => htmlspecialchars(strip_tags(trim($request->address)), ENT_QUOTES, 'UTF-8'),
                'state'                => $request->state,
                'lga'                  => $request->lga,
                'surgeon_name'         => htmlspecialchars(strip_tags(trim($request->surgeon_name)), ENT_QUOTES, 'UTF-8'),
                'surgeon_mdcn'         => strtoupper(trim($request->surgeon_mdcn)),
                'lsmoh_license'        => $request->lsmoh_license ? strtoupper(trim($request->lsmoh_license)) : null,
                'specialty_board'      => $request->specialty_board,
                'years_experience'     => (int)$request->years_experience,
                'procedures_performed' => (int)$request->procedures_performed,
                'whatsapp_number'      => preg_replace('/[^0-9+]/', '', $request->whatsapp_number),
                'email'                => strtolower(trim($request->email)),
                'instagram'            => $request->instagram,
                'website'              => $request->website,
                'selected_services'    => $request->selected_services,
                'clinic_photo_path'    => $clinicPhotoPath,
                'mdcn_cert_photo_path' => $mdcnCertPath,
                'lsmoh_cert_photo_path'=> $lsmohCertPath,
                'portfolio_photos'     => $portfolioPaths,
                'status'               => 'pending',
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Application submitted. Beauty clinic verification takes 5-7 business days. We will contact you via WhatsApp.',
            ], 201);

        } catch (Exception $e) {
            $ref = Str::upper(Str::random(8));
            Log::error("BEAUTY_REG_FAILURE [{$ref}]: " . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Registration failed. Please try again.', 'ref' => $ref], 500);
        }
    }
}