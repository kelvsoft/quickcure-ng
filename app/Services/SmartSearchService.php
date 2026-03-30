<?php

namespace App\Services;

/**
 * SmartSearchService
 * Resolves typos, pidgin, and synonyms into DB search terms.
 * Zero AI cost. Zero external API. Runs in microseconds.
 *
 * EXAMPLES:
 *   "snak bite"  → ["anti-venom","snake bite"]
 *   "oxigen"     → ["oxygen","oxygen cylinder"]
 *   "bbl"        → ["BBL","Brazilian butt lift"]  → track: aesthetics
 */
class SmartSearchService
{
    private array $map = [
        // Snake / Venom
        'snake bite'    => ['anti-venom','antivenom','snake bite'],
        'snake bte'     => ['anti-venom','antivenom','snake bite'],
        'snak bite'     => ['anti-venom','antivenom','snake bite'],
        'snak bit'      => ['anti-venom','antivenom','snake bite'],
        'snakebite'     => ['anti-venom','antivenom','snake bite'],
        'sanke bite'     => ['anti-venom','antivenom','snake bite'],
        'snake'         => ['anti-venom','antivenom','snake bite'],
        'bitten'        => ['anti-venom','antivenom'],
        'venom'         => ['anti-venom','antivenom'],
        'anti venom'    => ['anti-venom','antivenom'],
        'antivenom'     => ['anti-venom','antivenom'],
        'anti-venom'    => ['anti-venom','antivenom'],
        'anti vermon'   => ['anti-venom','antivenom'],
        'antivermon'    => ['anti-venom','antivenom'],
        'polyvalent'    => ['anti-venom','antivenom'],
        'scorpion'      => ['anti-venom','antivenom'],
        'poison'        => ['anti-venom','antivenom','poison control'],
        'poisoned'      => ['anti-venom','antivenom','poison control'],

        // Oxygen / Breathing
        'oxygen'        => ['oxygen','oxygen cylinder','ventilator'],
        'oxigen'        => ['oxygen','oxygen cylinder','ventilator'],
        'oxgyen'        => ['oxygen','oxygen cylinder','ventilator'],
        'oxyegen'       => ['oxygen','oxygen cylinder'],
        'breathing'     => ['oxygen','oxygen cylinder','respiratory'],
        'cant breathe'  => ['oxygen','oxygen cylinder','respiratory'],
        'respiratory'   => ['oxygen','respiratory','ventilator'],
        'ventilator'    => ['ventilator','oxygen','ICU'],
        'asthma'        => ['oxygen','oxygen cylinder','respiratory'],

        // Blood
        'blood'         => ['blood bank','blood transfusion'],
        'blood bank'    => ['blood bank','blood transfusion'],
        'bood bank'     => ['blood bank','blood transfusion'],
        'blod bank'     => ['blood bank','blood transfusion'],
        'transfusion'   => ['blood bank','blood transfusion'],
        'o positive'    => ['blood bank','O+'],
        'o negative'    => ['blood bank','O-'],
        'sickle cell'   => ['blood bank','sickle cell','haematology'],
        'anaemia'       => ['blood bank','anaemia'],
        'anemia'        => ['blood bank','anaemia'],

        // ICU
        'icu'           => ['ICU','intensive care','critical care'],
        'icu bed'       => ['ICU','ICU bed','intensive care'],
        'intensive care'=> ['ICU','intensive care','critical care'],
        'critical care' => ['ICU','intensive care','critical care'],
        'life support'  => ['ICU','intensive care','ventilator'],
        'unconscious'   => ['ICU','intensive care','emergency'],
        'coma'          => ['ICU','intensive care','neurology'],

        // Surgery
        'surgery'           => ['surgery','emergency surgery','theatre'],
        'operation'         => ['surgery','emergency surgery','theatre'],
        'emergency surgery' => ['emergency surgery','theatre','surgery'],
        'appendix'          => ['surgery','emergency surgery','appendectomy'],
        'stab'              => ['surgery','emergency surgery','trauma'],
        'gunshot'           => ['surgery','emergency surgery','trauma'],
        'accident'          => ['surgery','emergency surgery','trauma','orthopaedic'],
        'trauma'            => ['trauma','surgery','emergency surgery'],

        // Maternity
        'maternity'     => ['maternity','labour','delivery','obstetrics'],
        'labour'        => ['maternity','labour','delivery'],
        'labor'         => ['maternity','labour','delivery'],
        'delivery'      => ['maternity','labour','delivery'],
        'pregnant'      => ['maternity','obstetrics','antenatal'],
        'birth'         => ['maternity','labour','delivery'],
        'caesarean'     => ['maternity','caesarean','surgery'],
        'cs'            => ['maternity','caesarean'],
        'baby'          => ['maternity','paediatrics','neonatal'],
        'newborn'       => ['neonatal','paediatrics','maternity'],

        // Heart
        'heart attack'  => ['cardiology','cardiac','ECG','emergency'],
        'chest pain'    => ['cardiology','cardiac','ECG','emergency'],
        'cardiac'       => ['cardiology','cardiac','ECG'],
        'heart'         => ['cardiology','cardiac'],
        'ecg'           => ['ECG','cardiology'],

        // Stroke / Brain
        'stroke'        => ['neurology','stroke','CT scan','ICU'],
        'brain'         => ['neurology','neurosurgery','CT scan'],
        'seizure'       => ['neurology','emergency'],
        'fits'          => ['neurology','emergency'],
        'convulsion'    => ['neurology','emergency'],

        // Dialysis
        'dialysis'      => ['dialysis','kidney','renal'],
        'kidney'        => ['dialysis','kidney','renal','nephrology'],

        // Scanning
        'ct scan'       => ['CT scan','scan','radiology'],
        'ct'            => ['CT scan','scan','radiology'],
        'mri'           => ['MRI','scan','radiology'],
        'scan'          => ['CT scan','MRI','ultrasound','scan'],
        'xray'          => ['X-ray','radiology'],
        'x-ray'         => ['X-ray','radiology'],
        'x ray'         => ['X-ray','radiology'],
        'ultrasound'    => ['ultrasound','scan','radiology'],

        // Diabetes
        'diabetes'      => ['diabetes','endocrinology'],
        'diabetic'      => ['diabetes','insulin','endocrinology'],
        'sugar'         => ['diabetes','endocrinology'],

        // =============================================
        // AESTHETICS TRACK
        // =============================================
        'bbl'               => ['BBL','Brazilian butt lift','liposuction'],
        'butt lift'         => ['BBL','Brazilian butt lift'],
        'liposuction'       => ['liposuction','body contouring','BBL'],
        'lipo'              => ['liposuction','body contouring'],
        'hair transplant'   => ['hair transplant','FUE','hair restoration'],
        'hair loss'         => ['hair transplant','hair restoration'],
        'baldness'          => ['hair transplant','hair restoration'],
        'dental'            => ['dental veneers','dental implants','cosmetic dentistry'],
        'veneers'           => ['dental veneers','cosmetic dentistry'],
        'teeth'             => ['dental veneers','dental implants','cosmetic dentistry'],
        'skin'              => ['skin revision','dermatology','laser'],
        'rhinoplasty'       => ['rhinoplasty','nose job','cosmetic surgery'],
        'nose job'          => ['rhinoplasty','nose job'],
        'breast'            => ['breast augmentation','mammoplasty'],
        'tummy tuck'        => ['abdominoplasty','tummy tuck'],
        'botox'             => ['botox','aesthetics','anti-aging'],
        'filler'            => ['filler','botox','aesthetics'],
        'lip filler'        => ['filler','lip filler','aesthetics'],
    ];

    private array $aestheticsKeys = [
        'bbl','butt lift','liposuction','lipo','hair transplant','hair loss',
        'baldness','dental','veneers','teeth','skin','rhinoplasty','nose job',
        'breast','tummy tuck','botox','filler','lip filler','aesthetics',
    ];

    public function resolve(string $raw): array
    {
        $q = strtolower(trim($raw));

        // 1. Exact match
        if (isset($this->map[$q])) return $this->map[$q];

        // 2. Partial match
        foreach ($this->map as $key => $terms) {
            if (str_contains($key, $q) || str_contains($q, $key)) return $terms;
        }

        // 3. Levenshtein fuzzy match (distance ≤ 3)
        $best = null; $bestDist = PHP_INT_MAX;
        foreach (array_keys($this->map) as $key) {
            $d = levenshtein($q, $key);
            if ($d < $bestDist && $d <= 3) { $bestDist = $d; $best = $key; }
        }
        if ($best) return $this->map[$best];

        // 4. Fallback — search raw query as-is
        return [$raw];
    }

    public function detectTrack(string $raw): string
    {
        $q = strtolower(trim($raw));
        foreach ($this->aestheticsKeys as $key) {
            if (str_contains($q, $key) || levenshtein($q, $key) <= 2) return 'aesthetics';
        }
        return 'emergency';
    }
}