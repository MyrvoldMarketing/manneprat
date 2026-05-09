<?php
/**
 * contact.php — tar imot kontaktskjema fra kontakt.html.
 *
 * 1) Legger personen i MailerLite (med "kontakt" som kilde).
 * 2) Sender notifikasjons-mail til notify_email.
 *
 * Forventer JSON-body:
 *   { fornavn, epost, tlf, problem, melding }
 */

declare(strict_types=1);

require __DIR__ . '/lib_mailerlite.php';

$config = require __DIR__ . '/credentials.php';

mp_apply_cors($config['allowed_origins'] ?? []);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    mp_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    mp_json(['ok' => false, 'error' => 'invalid_json'], 400);
}

$fornavn = trim((string)($data['fornavn'] ?? ''));
$epost   = trim((string)($data['epost'] ?? ''));
$tlf     = trim((string)($data['tlf'] ?? ''));
$problem = trim((string)($data['problem'] ?? ''));
$melding = trim((string)($data['melding'] ?? ''));

if ($fornavn === '' || !filter_var($epost, FILTER_VALIDATE_EMAIL) || $problem === '') {
    mp_json(['ok' => false, 'error' => 'missing_fields'], 400);
}

// 1) MailerLite
$fields = [
    'name'        => $fornavn,
    'phone'       => $tlf,
    'mp_problem'  => $problem,
    'mp_message'  => $melding,
    'mp_source'   => 'kontakt-skjema',
];
$ml = mp_mailerlite_upsert(
    $config['mailerlite_api_key'],
    $epost,
    $fields,
    $config['mailerlite_group_id'] ?? ''
);
if (!$ml['ok']) {
    error_log('[manneprat] MailerLite error: ' . $ml['error']);
    // Vi feiler ikke kontakten av den grunn — fortsetter til mail.
}

// 2) Varslings-e-post til Fredrik
$to = $config['notify_email'] ?? 'hei@manneprat.no';
$subject = 'Ny henvendelse fra manneprat.no';
$body = "Ny kontakt fra nettsiden:\n\n"
      . "Navn:    {$fornavn}\n"
      . "E-post:  {$epost}\n"
      . "Tlf:     {$tlf}\n"
      . "Problem: {$problem}\n"
      . "Tid:     " . date('Y-m-d H:i') . "\n\n"
      . "Melding:\n{$melding}\n";

$headers = [
    'From: noreply@manneprat.no',
    'Reply-To: ' . $epost,
    'Content-Type: text/plain; charset=UTF-8',
];
@mail($to, $subject, $body, implode("\r\n", $headers));

mp_json(['ok' => true]);
