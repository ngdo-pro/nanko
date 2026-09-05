<?php

declare(strict_types=1);

namespace App\Tests\Unit\AuthAndIdentity\Adapter\Driver\Http\Security;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\JwtKeycloakValidator;
use PHPUnit\Framework\TestCase;

final class JwtKeycloakValidatorTest extends TestCase
{
    public function testRejectsMalformedToken(): void
    {
        $validator = new JwtKeycloakValidator();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Format de token JWT invalide');
        $validator->validate('not-a-jwt');
    }

    public function testRejectsTokenWithoutKid(): void
    {
        $validator = new JwtKeycloakValidator();
        $header = base64_encode('{"alg":"RS256"}');
        $payload = base64_encode('{"sub":"123"}');
        $sig = base64_encode('sig');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Claim "kid" manquant dans le header JWT');
        $validator->validate(sprintf('%s.%s.%s', $header, $payload, $sig));
    }

    public function testRejectsTokenWithoutSub(): void
    {
        // Generate RSA key pair
        $res = openssl_pkey_new([
            'digest_alg' => 'sha256',
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        self::assertNotFalse($res);
        $details = openssl_pkey_get_details($res);
        self::assertIsArray($details);

        $n = rtrim(strtr(base64_encode($details['rsa']['n']), '+/', '-_'), '=');
        $e = rtrim(strtr(base64_encode($details['rsa']['e']), '+/', '-_'), '=');

        $jwks = json_encode([
            'keys' => [
                [
                    'kid' => 'test-kid',
                    'kty' => 'RSA',
                    'n' => $n,
                    'e' => $e,
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $tmpFile = tempnam(sys_get_temp_dir(), 'jwks_');
        self::assertIsString($tmpFile);
        file_put_contents($tmpFile, $jwks);

        $validator = new JwtKeycloakValidator('file://' . $tmpFile);

        $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'kid' => 'test-kid'], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(json_encode(['email' => 'user@nanko.dev'], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $signedData = $header . '.' . $payload;

        openssl_sign($signedData, $signature, $res, OPENSSL_ALGO_SHA256);
        $sig = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        $jwt = $signedData . '.' . $sig;

        try {
            $this->expectException(\InvalidArgumentException::class);
            $this->expectExceptionMessage('Claim "sub" manquant dans le token');
            $validator->validate($jwt);
        } finally {
            @unlink($tmpFile);
        }
    }

    public function testValidTokenReturnsClaims(): void
    {
        // Generate RSA key pair
        $res = openssl_pkey_new([
            'digest_alg' => 'sha256',
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        self::assertNotFalse($res);
        $details = openssl_pkey_get_details($res);
        self::assertIsArray($details);

        $n = rtrim(strtr(base64_encode($details['rsa']['n']), '+/', '-_'), '=');
        $e = rtrim(strtr(base64_encode($details['rsa']['e']), '+/', '-_'), '=');

        $jwks = json_encode([
            'keys' => [
                [
                    'kid' => 'test-kid-2',
                    'kty' => 'RSA',
                    'n' => $n,
                    'e' => $e,
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $tmpFile = tempnam(sys_get_temp_dir(), 'jwks_');
        self::assertIsString($tmpFile);
        file_put_contents($tmpFile, $jwks);

        $validator = new JwtKeycloakValidator('file://' . $tmpFile);

        $header = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'kid' => 'test-kid-2'], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(json_encode(['sub' => '3fa85f64-5717-4562-b3fc-2c963f66afa6', 'email' => 'valid@nanko.dev'], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $signedData = $header . '.' . $payload;

        openssl_sign($signedData, $signature, $res, OPENSSL_ALGO_SHA256);
        $sig = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        $jwt = $signedData . '.' . $sig;

        try {
            $claims = $validator->validate($jwt);
            self::assertSame('3fa85f64-5717-4562-b3fc-2c963f66afa6', $claims['sub']);
            self::assertSame('valid@nanko.dev', $claims['email']);
        } finally {
            @unlink($tmpFile);
        }
    }
}
