<?php
/**
 * optin.php: tar imot påmeldinger fra /vsl-c/ (navn, e-post og telefon før videoen).
 *
 * 1) Legger personen i MailerLite (kilde "vsl-c-optin").
 * 2) Sender varsel til Fredrik, så han kan ta kontakt.
 * 3) Sender Lead til Meta fra serveren (Conversions API), så påmeldingen telles
 *    også når personen ikke har godtatt informasjonskapsler. Samme event_id som
 *    pikselen bruker, så Meta teller den bare én gang.
 *    Hoppes over når meta_capi_token mangler i credentials.php.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Oslo');

require __DIR__ . '/lib_mailerlite.php';

$config = require __DIR__ . '/credentials.php';

mp_apply_cors($config['allowed_origins'] ?? []);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    mp_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    mp_json(['ok' => false, 'error' => 'invalid_json'], 400);
}

$f = fn(string $k): string => trim(str_replace(["\r", "\n"], ' ', (string)($data[$k] ?? '')));
$fornavn = mb_substr($f('fornavn'), 0, 80);
$epost   = mb_substr($f('epost'), 0, 160);
$tlf     = mb_substr($f('tlf'), 0, 40);
$tlfSifre = preg_replace('/\D/', '', $tlf);

if ($fornavn === '' || filter_var($epost, FILTER_VALIDATE_EMAIL) === false || strlen($tlfSifre) < 8) {
    mp_json(['ok' => false, 'error' => 'missing_fields'], 400);
}

$utm = is_array($data['utm'] ?? null) ? $data['utm'] : [];
$ren = fn($v): string => trim(preg_replace('/[^\p{L}\p{N} ._+\-]/u', '', (string)$v));
$annonse = $ren($utm['utm_content'] ?? '') ?: 'ukjent';
$kampanje = $ren($utm['utm_campaign'] ?? '');
if ($kampanje !== '') { $annonse .= " (kampanje: {$kampanje})"; }

// 1) MailerLite
$ml = mp_mailerlite_upsert(
    $config['mailerlite_api_key'] ?? '',
    $epost,
    [
        'name'       => $fornavn,
        'phone'      => $tlf,
        'mp_problem' => 'vsl-c-optin',
        'mp_message' => 'Meldte seg på for å se videoen (VSL-C)',
        'mp_source'  => 'vsl-c-optin',
    ],
    $config['mailerlite_group_id'] ?? ''
);
if (!$ml['ok']) {
    error_log('[manneprat] MailerLite error (optin): ' . $ml['error']);
}

// 2) Varsel til Fredrik
$to = $config['notify_email'] ?? 'hei@manneprat.no';
$subject = "Ny påmelding til videoen: {$fornavn}";
$body = "Ny påmelding fra VSL-C. Personen har gitt navn, e-post og telefon for å se videoen, men har ikke booket ennå.\n\n"
      . "Navn:     {$fornavn}\n"
      . "E-post:   {$epost}\n"
      . "Tlf:      {$tlf}\n"
      . "Annonse:  {$annonse}\n"
      . "Sendt:    " . date('Y-m-d H:i') . "\n";
$headers = [
    'From: noreply@manneprat.no',
    'Reply-To: ' . $epost,
    'Content-Type: text/plain; charset=UTF-8',
];
if (!@mail($to, $subject, $body, implode("\r\n", $headers))) {
    error_log('[manneprat] mail() feilet for optin fra ' . $epost);
}

// 3) Meta Conversions API
$token = (string)($config['meta_capi_token'] ?? '');
if ($token !== '') {
    $h = fn(string $v): string => hash('sha256', $v);
    $ph = $tlfSifre;
    if (strlen($ph) === 8) { $ph = '47' . $ph; }          // norsk nummer uten landskode
    if (str_starts_with($ph, '0047')) { $ph = substr($ph, 2); }
    $eventId = preg_replace('/[^A-Za-z0-9_\-]/', '', $f('event_id')) ?: ('optin-' . bin2hex(random_bytes(6)));
    $url = filter_var($f('url'), FILTER_VALIDATE_URL) ?: 'https://manneprat.no/vsl-c/';

    $userData = [
        'em' => [$h(mb_strtolower($epost))],
        'ph' => [$h($ph)],
        'fn' => [$h(mb_strtolower($fornavn))],
        'country' => [$h('no')],
        'client_ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
        'client_user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ];
    $fbc = $ren($data['fbc'] ?? '');
    $fbp = $ren($data['fbp'] ?? '');
    if (str_starts_with($fbc, 'fb.')) { $userData['fbc'] = $fbc; }
    if (str_starts_with($fbp, 'fb.')) { $userData['fbp'] = $fbp; }

    $payload = [
        'data' => [[
            'event_name'       => 'Lead',
            'event_time'       => time(),
            'event_id'         => $eventId,
            'action_source'    => 'website',
            'event_source_url' => $url,
            'user_data'        => $userData,
            'custom_data'      => ['content_name' => 'vsl-c-optin', 'content_category' => 'vsl-c-optin'],
        ]],
    ];
    if (!empty($config['meta_test_event_code'])) {
        $payload['test_event_code'] = (string)$config['meta_test_event_code'];
    }

    $pixel = (string)($config['meta_pixel_id'] ?? '9511327085566493');
    $ver = (string)($config['meta_api_version'] ?? 'v24.0');
    $ch = curl_init("https://graph.facebook.com/{$ver}/{$pixel}/events?access_token=" . urlencode($token));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 8,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($res === false || $code >= 300) {
        error_log('[manneprat] Meta CAPI feilet (' . $code . '): ' . (is_string($res) ? mb_substr($res, 0, 300) : 'curl'));
    }
}

mp_json(['ok' => true]);
