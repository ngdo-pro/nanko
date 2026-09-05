<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driver\Http\Security;

use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

final class JwtKeycloakValidator
{
    public function __construct(
        private readonly ?string $jwksUrl = null,
        private readonly ?CacheInterface $cache = null,
    ) {}

    /**
     * @return array{sub: string, email: string, name?: string}
     *
     * @throws \InvalidArgumentException
     */
    public function validate(string $jwt): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new \InvalidArgumentException('Format de token JWT invalide.');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $headerJson = self::base64UrlDecode($headerB64);
        $payloadJson = self::base64UrlDecode($payloadB64);

        /** @var array{alg?: string, kid?: string}|null $header */
        $header = json_decode($headerJson, true);
        /** @var array{sub?: string, email?: string, exp?: int, iss?: string}|null $payload */
        $payload = json_decode($payloadJson, true);

        if (!is_array($header) || !is_array($payload)) {
            throw new \InvalidArgumentException('Échec du décodage JSON du JWT.');
        }

        if (($header['alg'] ?? '') !== 'RS256') {
            throw new \InvalidArgumentException('Algorithme de signature non supporté (seul RS256 est autorisé).');
        }

        $kid = $header['kid'] ?? null;
        if ($kid === null || $kid === '') {
            throw new \InvalidArgumentException('Claim "kid" manquant dans le header JWT.');
        }

        if (empty($payload['sub'])) {
            throw new \InvalidArgumentException('Claim "sub" manquant dans le token.');
        }

        // Vérification expiration si présente
        $exp = $payload['exp'] ?? null;
        if ($exp !== null && time() >= $exp) {
            throw new \InvalidArgumentException('Le jeton est expiré.');
        }

        // Vérification de signature
        $publicKey = $this->getPublicKeyForKid($kid);
        $signingInput = $headerB64 . '.' . $payloadB64;
        $signature = self::base64UrlDecode($signatureB64);

        $verifyResult = openssl_verify($signingInput, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($verifyResult !== 1) {
            throw new \InvalidArgumentException('Signature JWT invalide.');
        }

        return [
            'sub' => (string) $payload['sub'],
            'email' => (string) ($payload['email'] ?? ''),
        ];
    }

    public static function jwkToPem(string $n, string $e): string
    {
        $modulus = self::base64UrlDecode($n);
        $exponent = self::base64UrlDecode($e);

        $modulus = ltrim($modulus, "\x00");
        if ((ord($modulus[0]) & 0x80) !== 0) {
            $modulus = "\x00" . $modulus;
        }

        $exponent = ltrim($exponent, "\x00");
        if ((ord($exponent[0]) & 0x80) !== 0) {
            $exponent = "\x00" . $exponent;
        }

        $encodeLength = static function (int $len): string {
            if ($len < 128) {
                /** @var int<0, 255> $byte */
                $byte = max(0, min(127, $len));

                return chr($byte);
            }
            $lenBytes = '';
            while ($len > 0) {
                /** @var int<0, 255> $byte */
                $byte = $len & 0xFF;
                $lenBytes = chr($byte) . $lenBytes;
                $len >>= 8;
            }
            /** @var int<0, 255> $headerByte */
            $headerByte = 0x80 | (strlen($lenBytes) & 0x7F);

            return chr($headerByte) . $lenBytes;
        };

        $modSequence = "\x02" . $encodeLength(strlen($modulus)) . $modulus
                     . "\x02" . $encodeLength(strlen($exponent)) . $exponent;
        $rsaPublicKey = "\x30" . $encodeLength(strlen($modSequence)) . $modSequence;

        $algorithmIdentifier = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $bitString = "\x03" . $encodeLength(strlen($rsaPublicKey) + 1) . "\x00" . $rsaPublicKey;
        $totalSeq = "\x30" . $encodeLength(strlen($algorithmIdentifier . $bitString)) . $algorithmIdentifier . $bitString;

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($totalSeq), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    public static function base64UrlDecode(string $input): string
    {
        $remainder = strlen($input) % 4;
        if ($remainder > 0) {
            $input .= str_repeat('=', 4 - $remainder);
        }

        return (string) base64_decode(strtr($input, '-_', '+/'), true);
    }

    private function getPublicKeyForKid(string $kid): string
    {
        if ($this->cache !== null) {
            return (string) $this->cache->get('keycloak_jwks_' . $kid, function (ItemInterface $item) use ($kid): string {
                $item->expiresAfter(3600);

                return $this->fetchPublicKeyFromJwks($kid);
            });
        }

        return $this->fetchPublicKeyFromJwks($kid);
    }

    private function fetchPublicKeyFromJwks(string $kid): string
    {
        $jwksUrl = $this->jwksUrl;
        if ($jwksUrl === null) {
            $envJwks = $_ENV['KEYCLOAK_JWKS_URL'] ?? null;
            $jwksUrl = is_string($envJwks) && $envJwks !== ''
                ? $envJwks
                : 'http://keycloak:8080/realms/nanko/protocol/openid-connect/certs';
        }

        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]);

        $content = @file_get_contents($jwksUrl, false, $context);
        if ($content === false) {
            throw new \RuntimeException('Impossible de récupérer le JWKS depuis ' . $jwksUrl);
        }

        /** @var mixed $raw */
        $raw = json_decode($content, true);
        if (!is_array($raw) || !isset($raw['keys']) || !is_array($raw['keys'])) {
            throw new \RuntimeException('Format JWKS invalide reçu de Keycloak.');
        }

        /** @var list<array<string, mixed>> $keys */
        $keys = $raw['keys'];
        foreach ($keys as $key) {
            $keyKid = $key['kid'] ?? null;
            $keyKty = $key['kty'] ?? null;
            $keyN = $key['n'] ?? null;
            $keyE = $key['e'] ?? null;
            if ($keyKid === $kid && $keyKty === 'RSA' && is_string($keyN) && is_string($keyE)) {
                return self::jwkToPem($keyN, $keyE);
            }
        }

        throw new \RuntimeException(sprintf('Clé publique introuvable pour le kid "%s".', $kid));
    }
}
