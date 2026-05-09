<?php
/**
 * subscribe.php — tar imot quiz-leads fra index.html og sender til MailerLite.
 *
 * Forventer JSON-body:
 *   { name, email, problem, score, dims: { reg, id, gr, sf, ret } }
 *
 * Returnerer JSON: { ok: true } ved suksess, { ok: false, error: "..." } ved feil.
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

$name  = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    mp_json(['ok' => false, 'error' => 'missing_fields'], 400);
}

$problem = (string)($data['problem'] ?? '');
$score   = isset($data['score']) ? (int)$data['score'] : null;
$dims    = is_array($data['dims'] ?? null) ? $data['dims'] : [];

$fields = [
    'name'             => $name,
    'mp_problem'       => $problem,
    'mp_source'        => 'comeback-quiz',
];
if ($score !== null) {
    $fields['mp_score'] = $score;
}
foreach (['reg', 'id', 'gr', 'sf', 'ret'] as $k) {
    if (isset($dims[$k])) {
        $fields['mp_dim_' . $k] = (int)$dims[$k];
    }
}

$result = mp_mailerlite_upsert(
    $config['mailerlite_api_key'],
    $email,
    $fields,
    $config['mailerlite_group_id'] ?? ''
);

if (!$result['ok']) {
    error_log('[manneprat] MailerLite error: ' . $result['error']);
    mp_json(['ok' => false, 'error' => 'upstream_error'], 502);
}

mp_json(['ok' => true]);
