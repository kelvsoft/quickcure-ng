<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
// Use a Job to remove processing bottlenecks
// use App\Jobs\ProcessWhatsAppWebhook; 

class WhatsAppBotController extends Controller
{
    public function verify(Request $request)
    {
        // Hub Mode and Verify Token are standard Meta parameters
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.whatsapp.verify_token')) {
            return response($challenge, 200);
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }

    public function handle(Request $request)
    {
        $data = $request->all();

        // Security First: Quick validation of the entry structure
        if (!isset($data['entry'][0]['changes'][0]['value'])) {
            return response()->json(['status' => 'ignored'], 200);
        }

        try {
            /** * BOTTLENECK REMOVAL: 
             * In a production environment, you should dispatch a Job here 
             * so the response is sent back to WhatsApp in milliseconds.
             * * ProcessWhatsAppWebhook::dispatch($data);
             */

            Log::info('WhatsApp Webhook Payload', ['payload' => $data]);

            // Immediately acknowledge receipt to Meta
            return response()->json(['status' => 'received'], 200);
            
        } catch (\Exception $e) {
            Log::error('WhatsApp Webhook Failure', ['message' => $e->getMessage()]);
            // Still return 200 to prevent WhatsApp from retrying an unfixable error
            return response()->json(['status' => 'error_logged'], 200);
        }
    }
}