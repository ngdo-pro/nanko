<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driver\Http\Security;

use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser\Command as SynchronizeUserCommand;
use App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser\Handler as SynchronizeUserHandler;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

final class JwtKeycloakAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    public function __construct(
        private readonly JwtKeycloakValidator $validator,
        private readonly SynchronizeUserHandler $synchronizeUserHandler,
    ) {}

    public function supports(Request $request): bool
    {
        $authHeader = $request->headers->get('Authorization');
        if ($authHeader === null || !str_starts_with($authHeader, 'Bearer ')) {
            return false;
        }

        return true;
    }

    public function authenticate(Request $request): Passport
    {
        $authHeader = (string) $request->headers->get('Authorization');
        $token = substr($authHeader, 7);

        try {
            $claims = $this->validator->validate($token);
        } catch (\Throwable $e) {
            throw new CustomUserMessageAuthenticationException($e->getMessage(), [], 0, $e);
        }

        $user = $this->synchronizeUserHandler->handle(
            new SynchronizeUserCommand(
                keycloakId: KeycloakId::fromString($claims['sub']),
                email: $claims['email'],
            )
        );

        return new SelfValidatingPassport(
            new UserBadge($user->id->toString(), static fn() => new SecurityUser($user))
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): Response
    {
        return new JsonResponse([
            'code' => 'UNAUTHORIZED',
            'message' => $exception->getMessageKey(),
        ], Response::HTTP_UNAUTHORIZED);
    }

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse([
            'code' => 'UNAUTHORIZED',
            'message' => 'Token JWT manquant, invalide ou expiré.',
        ], Response::HTTP_UNAUTHORIZED);
    }
}
