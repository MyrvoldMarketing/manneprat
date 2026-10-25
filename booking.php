<?php
/**
 * booking.php: tar imot bookinger fra /vsl-booking/ (VSL-funnelen).
 *
 * 1) Legger personen i MailerLite (kilde "vsl-booking").
 * 2) Sender varsel til Fredrik med svarene og ønsket tidspunkt.
 *    Tidspunktet er et ønske: Fredrik bekrefter det på e-post.
 */

declare(strict_types=1);

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
$fornavn = $f('fornavn');
$epost   = $f('epost');
$tlf     = $f('tlf');
$dag     = $f('dag');
$tid     = $f('tid');
$q1 = trim((string)($data['q1'] ?? ''));
$q2 = $f('q2');
$q3 = trim((string)($data['q3'] ?? ''));
$q4 = $f('q4');
$q5 = $f('q5');

$harEpost = filter_var($epost, FILTER_VALIDATE_EMAIL) !== false;
$tlfSifre = preg_replace('/\D/', '', $tlf);
// Bookingsiden spør om telefon; eldre versjoner sendte e-post. Ett av dem må være gyldig.
if ($fornavn === '' || (!$harEpost && strlen($tlfSifre) < 8) || $dag === '' || $tid === '') {
    mp_json(['ok' => false, 'error' => 'missing_fields'], 400);
}

$utm = is_array($data['utm'] ?? null) ? $data['utm'] : [];
$annonse = trim(preg_replace('/[^\p{L}\p{N} ._+\-]/u', '', (string)($utm['utm_content'] ?? '')));
$kampanje = trim(preg_replace('/[^\p{L}\p{N} ._+\-]/u', '', (string)($utm['utm_campaign'] ?? '')));
if ($annonse === '') { $annonse = 'ukjent'; }
if ($kampanje !== '') { $annonse .= " (kampanje: {$kampanje})"; }
$video = $f('video') ?: 'ukjent';

// 1) MailerLite (bare når vi har e-post)
if ($harEpost) {
    $ml = mp_mailerlite_upsert(
        $config['mailerlite_api_key'],
        $epost,
        [
            'name'       => $fornavn,
            'phone'      => $tlf,
            'mp_problem' => $q1 !== '' ? mb_substr($q1, 0, 250) : 'vsl-booking',
            'mp_message' => "Ønsket tid: {$dag} kl. {$tid}",
            'mp_source'  => 'vsl-booking',
        ],
        $config['mailerlite_group_id'] ?? ''
    );
    if (!$ml['ok']) {
        error_log('[manneprat] MailerLite error (booking): ' . $ml['error']);
    }
}

// 2) Varsel til Fredrik
$to = $config['notify_email'] ?? 'hei@manneprat.no';
$subject = "Ny booking: {$fornavn}, {$dag} kl. {$tid}";
$body = "Ny booking fra VSL-siden. Ring eller send SMS for å bekrefte tidspunktet.\n\n"
      . "Ønsket tid: {$dag} kl. {$tid}\n"
      . "Navn:       {$fornavn}\n"
      . "E-post:     {$epost}\n"
      . "Tlf:        {$tlf}\n"
      . "Video:      {$video}\n"
      . "Annonse:    {$annonse}\n"
      . "Sendt:      " . date('Y-m-d H:i') . "\n";
// Eldre versjon av siden sendte også fem spørsmål; ta dem med hvis de finnes
$sporsmal = [
    'Hva ønsker du mest hjelp med akkurat nå?' => $q1,
    'Hvor lenge har dette vært et tema?' => $q2,
    'Hva ville vært annerledes om seks måneder?' => $q3,
    'Hvor viktig er det å gjøre noe med dette nå? (1 til 10)' => $q4,
    'Klar til å prioritere et seks måneders forløp?' => $q5,
];
foreach ($sporsmal as $sp => $sv) {
    if ($sv !== '') { $body .= "\n{$sp}\n{$sv}\n"; }
}

$headers = [
    'From: noreply@manneprat.no',
    $harEpost ? 'Reply-To: ' . $epost : 'X-Manneprat: booking',
    'Content-Type: text/plain; charset=UTF-8',
];
$sent = @mail($to, $subject, $body, implode("\r\n", $headers));
if (!$sent) {
    error_log('[manneprat] mail() feilet for booking fra ' . $epost);
}

mp_json(['ok' => true]);
