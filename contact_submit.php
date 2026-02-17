<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Configuration
$toEmail = 'your@email.com';
$toName = 'Site Contact';
$fromEmail = 'no-reply@example.com';
$fromName = 'Website Contact';
$enableLog = false;
$logFile = __DIR__ . '/contact_logs.txt';

// Optional: set this in your server environment to enable reCAPTCHA validation.
$recaptchaSecret = getenv('RECAPTCHA_SECRET') ?: '';

// Only accept POST requests.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'message' => 'Invalid request method.'
    ]);
    exit;
}

// Enforce HTTPS (allow localhost for testing).
$httpsOn = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$host = $_SERVER['HTTP_HOST'] ?? '';
if (!$httpsOn && !str_starts_with($host, 'localhost')) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => 'This form only works over HTTPS.'
    ]);
    exit;
}

// Honeypot field (bots tend to fill it).
$honeypot = trim((string) filter_input(INPUT_POST, 'website', FILTER_UNSAFE_RAW));
if ($honeypot !== '') {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => 'Invalid submission.'
    ]);
    exit;
}

// Sanitize inputs.
$name = (string) filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$email = (string) filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
$subject = (string) filter_input(INPUT_POST, 'subject', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$message = (string) filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$phone = (string) filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$consent = (string) filter_input(INPUT_POST, 'consent', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
$recaptchaToken = (string) filter_input(INPUT_POST, 'recaptcha_token', FILTER_UNSAFE_RAW);

$errors = [];

if (mb_strlen(trim($name)) < 3) {
    $errors['name'] = 'Please enter your full name.';
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}

if (mb_strlen(trim($subject)) < 3) {
    $errors['subject'] = 'Please enter a subject.';
}

if (mb_strlen(trim($message)) < 10) {
    $errors['message'] = 'Please write at least 10 characters.';
}

if ($phone !== '' && !preg_match('/^[0-9\s\-+().]{7,20}$/', $phone)) {
    $errors['phone'] = 'Please enter a valid phone number.';
}

// Optional reCAPTCHA validation.
if ($recaptchaSecret !== '') {
    if ($recaptchaToken === '') {
        $errors['recaptcha'] = 'reCAPTCHA validation failed.';
    } else {
        $recaptchaResult = verifyRecaptcha($recaptchaSecret, $recaptchaToken);
        if (!$recaptchaResult['success']) {
            $errors['recaptcha'] = 'reCAPTCHA validation failed.';
        }
    }
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode([
        'ok' => false,
        'message' => 'Please review the highlighted fields.',
        'errors' => $errors
    ]);
    exit;
}

// Protect against header injection.
$safeSubject = preg_replace("/[\r\n]+/", ' ', $subject);
$safeEmail = preg_replace("/[\r\n]+/", ' ', $email);

$bodyLines = [
    'New contact form submission:',
    "Name: {$name}",
    "Email: {$safeEmail}",
    "Phone: " . ($phone !== '' ? $phone : 'Not provided'),
    "Consent LGPD: " . ($consent === 'yes' ? 'Yes' : 'No'),
    '---',
    $message
];
$body = implode("\n", $bodyLines);

$sendOk = false;
$mailError = '';

// Prefer PHPMailer if available.
if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer') && file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
    try {
        $mailer = new PHPMailer\PHPMailer\PHPMailer(true);
        $mailer->isMail();
        $mailer->CharSet = 'UTF-8';
        $mailer->setFrom($fromEmail, $fromName);
        $mailer->addAddress($toEmail, $toName);
        $mailer->addReplyTo($safeEmail, $name);
        $mailer->Subject = $safeSubject;
        $mailer->Body = $body;
        $mailer->AltBody = $body;
        $sendOk = $mailer->send();
    } catch (Throwable $exception) {
        $mailError = $exception->getMessage();
        $sendOk = false;
    }
} else {
    $headers = [
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $safeEmail,
        'Content-Type: text/plain; charset=UTF-8'
    ];
    $sendOk = mail($toEmail, $safeSubject, $body, implode("\r\n", $headers));
}

if ($enableLog) {
    $logEntry = sprintf(
        "[%s] %s | %s | %s\n",
        date('c'),
        $sendOk ? 'OK' : 'FAIL',
        $safeEmail,
        $mailError
    );
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

if (!$sendOk) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Unable to send your message right now. Please try again later.'
    ]);
    exit;
}

echo json_encode([
    'ok' => true,
    'message' => 'Thanks! Your message has been sent.'
]);

function verifyRecaptcha(string $secret, string $token): array
{
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = http_build_query([
        'secret' => $secret,
        'response' => $token
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $data,
            'timeout' => 5
        ]
    ]);

    $response = file_get_contents($url, false, $context);
    if ($response === false) {
        return ['success' => false];
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        return ['success' => false];
    }

    return $decoded;
}
