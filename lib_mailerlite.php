<?php
/**
 * Hjelpefunksjoner for MailerLite-integrasjon + JSON/CORS.
 */

declare(strict_types=1);

/**
 * Sett CORS-headere basert på allowed_origins fra credentials.php.
 * Håndterer også OPTIONS-preflight.
 */
function mp_apply_cors(array $allowed): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Skriv ut JSON og avslutt.
 */
function mp_json(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/**
 * Opprett eller oppdater en subscriber i MailerLite (nye API: connect.mailerlite.com).
 *
 * @return array{ok: bool, error?: string, response?: array}
 */
function mp_mailerlite_upsert(string $apiKey, string $email, array $fields, string $groupId = ''): array
{
    if ($apiKey === '') {
        return ['ok' => false, 'error' => 'missing_api_key'];
    }

    $payload = [
        'email'  => $email,
        'fields' => $fields,
        'status' => 'active',
    ];
    if ($groupId !== '') {
        $payload['groups'] = [$groupId];
    }

    $ch = curl_init('https://connect.mailerlite.com/api/subscribers');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ['ok' => false, 'error' => 'curl: ' . $curlErr];
    }

    $decoded = json_decode($response, true);
    if ($httpCode >= 200 && $httpCode < 300) {
        return ['ok' => true, 'response' => is_array($decoded) ? $decoded : []];
    }

    $msg = is_array($decoded) && isset($decoded['message'])
        ? $decoded['message']
        : ('http_' . $httpCode);
    return ['ok' => false, 'error' => $msg];
}
