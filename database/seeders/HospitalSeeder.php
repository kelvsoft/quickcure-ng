<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Hospital;
use App\Models\Service;

class HospitalSeeder extends Seeder
{
    public function run(): void
    {
        $hospital1 = Hospital::updateOrCreate(
            ['email' => 'info@stnicholashospital.com'],
            [
                'name' => 'St. Nicholas Hospital',
                'slug' => 'st-nicholas-lagos-island',
                'phone' => '08033000001',
                'whatsapp_number' => '2348033000001',
                'address' => '57 Campbell Street, Lagos Island',
                'lat' => 6.452900,
                'lng' => 3.393400,
                'is_premium' => true,
                'is_verified' => true,
                'tier' => 'gold',
            ]
        );

        Service::updateOrCreate(
            ['hospital_id' => $hospital1->id, 'service_name' => 'Anti-Venom (Polyvalent)'],
            [
                'category' => 'emergency',
                'status' => 'available',
                'current_stock' => 15,
                'price' => 55000.00,
                'is_verified' => true,
                'last_confirmed_at' => now(),
            ]
        );

        $hospital2 = Hospital::updateOrCreate(
            ['email' => 'care@reddington.ng'],
            [
                'name' => 'Reddington Hospital',
                'slug' => 'reddington-vi',
                'phone' => '08033000002',
                'whatsapp_number' => '2348033000002',
                'address' => '12 Idowu Taylor St, Victoria Island',
                'lat' => 6.429100,
                'lng' => 3.418400,
                'is_premium' => false,
                'is_verified' => true,
                'tier' => 'silver',
            ]
        );

        Service::updateOrCreate(
            ['hospital_id' => $hospital2->id, 'service_name' => 'Oxygen Cylinder'],
            [
                'category' => 'medical_gas',
                'status' => 'available',
                'current_stock' => 8,
                'price' => 35000.00,
                'is_verified' => true,
                'last_confirmed_at' => now(),
            ]
        );
    }
}