<?php
// Mal for credentials.php. Kopier til credentials.php og fyll inn ekte verdier.
// credentials.php er .gitignore'et og skal ALDRI committes.

return [
    // MailerLite API token (Integrations -> Developer API -> Generate new token)
    'mailerlite_api_key' => 'DIN_API_NOKKEL_HER',

    // Valgfritt: gruppe-ID for å legge subscribers i en spesifikk gruppe.
    // La stå tom for å bare legge dem i hovedlista. Finn ID i URL-en når du
    // åpner gruppen i MailerLite (.../groups/XXXXXXX).
    'mailerlite_group_id' => '',

    // Hvor notifikasjons-mail fra kontaktskjemaet sendes
    'notify_email' => 'hei@manneprat.no',

    // Meta Conversions API (brukes av optin.php). Tomt token = sendes bare fra pikselen.
    // Token lages i Events Manager -> pikselen -> Settings -> Conversions API -> Generate access token.
    'meta_pixel_id' => '1557481308803825',
    'meta_capi_token' => '',
    'meta_api_version' => 'v24.0',
    // Fyll inn koden fra Events Manager -> Test events for å teste, og tøm den etterpå.
    'meta_test_event_code' => '',

    // Tillatte origins (CORS). Legg til prod-domenet ditt.
    'allowed_origins' => [
        'https://manneprat.no',
        'https://www.manneprat.no',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ],
];
