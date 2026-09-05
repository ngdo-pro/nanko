VPS ?= nanko-vps
REMOTE_DIR ?= nanko

.PHONY: help dev stop logs test-backend test-e2e test-e2e-ui composer deptrac static-analysis lint lint-fix deploy-preprod deploy-prod

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# Runs postgres + backend + frontend + landing from infra/local/compose.yaml
# in the background, all dockerized -- no PHP/Composer/Node/pnpm needed on
# the host, only Docker. Source is bind-mounted into the backend/frontend/
# landing containers, so edits are picked up live without a rebuild;
# `--build` just keeps the images (extensions, corepack) in sync with the
# Dockerfiles.
# Host ports are non-default (45432/48000/45173/45174/48080) to avoid clashing
# with other projects' postgres/backend/frontend/landing/keycloak on this machine.
dev: ## Start the local dev stack (postgres+keycloak+backend+frontend+landing)
	docker compose -f infra/local/compose.yaml up -d --build
	@echo
	@echo "frontend: http://localhost:45173"
	@echo "landing:  http://localhost:45174"
	@echo "backend:  http://localhost:48000"
	@echo "keycloak: http://localhost:48080"
	@echo "postgres: localhost:45432"
	@echo
	@echo "(first run installs composer/pnpm deps in the background -- 'make logs' to follow progress)"

stop: ## Stop the local dev stack
	docker compose -f infra/local/compose.yaml down

logs: ## Follow logs of the local dev stack
	docker compose -f infra/local/compose.yaml logs -f

# Runs against the "backend" service's own postgres connection (see
# infra/local/compose.yaml), with dbname_suffix=_test applied by
# config/packages/doctrine.php's when@test block -- creating the test
# database is idempotent (--if-not-exists) so this is safe to rerun.
# APP_ENV=test is passed explicitly to every step, including phpunit itself:
# the backend service sets APP_ENV=dev in its container environment, and
# Symfony's KernelTestCase reads $_ENV before phpunit.dist.xml's <server>
# override, so without this override integration/functional tests would
# silently boot the dev kernel instead of test.
test-backend: ## Run the backend test suite (phpunit)
	docker compose -f infra/local/compose.yaml exec -e APP_ENV=test backend sh -c ' \
		php bin/console doctrine:database:create --if-not-exists --no-interaction && \
		php bin/console doctrine:migrations:migrate --no-interaction && \
		php bin/phpunit'

# Runs Playwright E2E tests against the local dev stack.
# Automatically ensures local containers (postgres, keycloak, backend, frontend) are running.
# Usage: make test-e2e
#        make test-e2e ARGS="--ui"
test-e2e: ## Run E2E tests against local dev stack (starts dev stack if needed)
	@docker compose -f infra/local/compose.yaml up -d
	@until curl -s http://localhost:48080/realms/nanko/.well-known/openid-configuration > /dev/null 2>&1; do sleep 1; done
	pnpm --filter tests-e2e test $(ARGS)

test-e2e-ui: ## Run E2E tests with Playwright interactive UI
	@$(MAKE) test-e2e ARGS="--ui"

# Runs composer inside the backend container -- there's no PHP/Composer on
# the host. Usage: make composer ARGS="require --dev phpstan/phpstan-symfony"
composer: ## Run composer in the backend container (ARGS="require ...")
	docker compose -f infra/local/compose.yaml exec backend composer $(ARGS)

# Enforces the Core/Port/Adapter dependency direction -- see
# docs/adr/0011-hexagonal-architecture-backend.md.
deptrac: ## Enforce backend hexagonal architecture boundaries
	docker compose -f infra/local/compose.yaml exec backend vendor/bin/deptrac analyse

# Backend: phpstan, see backend/phpstan.neon. Frontend: tsc project-reference
# build with no emit (frontend/tsconfig*.json), which is what "typecheck"
# runs -- same check as `build` without the vite bundling step.
static-analysis: ## Run static analysis (backend phpstan + frontend tsc)
	docker compose -f infra/local/compose.yaml exec backend vendor/bin/phpstan analyse --memory-limit=512M
	docker compose -f infra/local/compose.yaml exec frontend pnpm --filter frontend typecheck

# Backend: php-cs-fixer, see backend/.php-cs-fixer.dist.php (same ruleset as
# Evaneos/trip-project). --allow-risky=yes is required by declare_strict_types.
# Frontend: oxlint.
lint: ## Lint all code (backend cs-fixer dry-run + frontend oxlint)
	docker compose -f infra/local/compose.yaml exec backend vendor/bin/php-cs-fixer fix --allow-risky=yes --dry-run --diff
	docker compose -f infra/local/compose.yaml exec frontend pnpm --filter frontend lint

lint-fix: ## Lint and auto-fix all code (backend cs-fixer + frontend oxlint --fix)
	docker compose -f infra/local/compose.yaml exec backend vendor/bin/php-cs-fixer fix --allow-risky=yes --diff
	docker compose -f infra/local/compose.yaml exec frontend pnpm --filter frontend lint:fix

# Compose-structure changes only (new service, changed labels/ports) --
# ordinary code changes just produce a new image and are picked up by
# Watchtower on its own; this is deliberately NOT wired into CI, to keep
# zero deploy credentials in GitHub Actions.
deploy-preprod: ## Deploy to preprod (git pull + compose up on the VPS)
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-preprod -f infra/preprod/compose.yaml \
		--env-file ~/.config/nanko/preprod.env up -d"

deploy-prod: ## Deploy to prod (git pull + compose up on the VPS)
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-prod -f infra/prod/compose.yaml \
		--env-file ~/.config/nanko/prod.env up -d"
