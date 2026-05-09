<?php
// Kopier denne filen til config.php og fyll inn dine egne verdier.
// config.php er .gitignore'et og skal ALDRI committes.

return [
    // MailerLite API token (Integrations -> Developer API)
    'mailerlite_api_key' => 'DIN_API_NOKKEL_HER',

    // Gruppe-ID for "Manneprat Leads"
    // Finn den i MailerLite: Subscribers -> Groups -> klikk gruppen, ID i URL.
    'mailerlite_group_id' => 'DIN_GRUPPE_ID_HER',

    // Hvor leads/kontakt skal varsles (mottaker av notifikasjons-mail)
    'notify_email' => 'hei@manneprat.no',

    // Tillatte origins (CORS). Legg til prod-domenet ditt.
    'allowed_origins' => [
        'https://manneprat.no',
        'https://www.manneprat.no',
        'http://localhost:8000',
    ],
];
