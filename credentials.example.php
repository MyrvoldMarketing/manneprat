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

    // Tillatte origins (CORS). Legg til prod-domenet ditt.
    'allowed_origins' => [
        'https://manneprat.no',
        'https://www.manneprat.no',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ],
];
