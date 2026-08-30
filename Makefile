VPS ?= nanko-vps
REMOTE_DIR ?= nanko

.PHONY: dev stop logs test-backend deptrac deploy-preprod deploy-prod

# Runs postgres + backend + frontend from infra/local/compose.yaml in
# the background, all dockerized -- no PHP/Composer/Node/pnpm needed on the
# host, only Docker. Source is bind-mounted into the backend/frontend
# containers, so edits are picked up live without a rebuild; `--build` just
# keeps the images (extensions, corepack) in sync with the Dockerfiles.
# Host ports are non-default (45432/48000/45173) to avoid clashing with
# other projects' postgres/backend/frontend on this machine.
dev:
	docker compose -f infra/local/compose.yaml up -d --build
	@echo
	@echo "frontend: http://localhost:45173"
	@echo "backend:  http://localhost:48000"
	@echo "postgres: localhost:45432"
	@echo
	@echo "(first run installs composer/pnpm deps in the background -- 'make logs' to follow progress)"

stop:
	docker compose -f infra/local/compose.yaml down

logs:
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
test-backend:
	docker compose -f infra/local/compose.yaml exec -e APP_ENV=test backend sh -c ' \
		php bin/console doctrine:database:create --if-not-exists --no-interaction && \
		php bin/console doctrine:migrations:migrate --no-interaction && \
		php bin/phpunit'

# Enforces the Core/Port/Adapter dependency direction -- see
# docs/adr/0011-hexagonal-architecture-backend.md.
deptrac:
	docker compose -f infra/local/compose.yaml exec backend vendor/bin/deptrac analyse

# Compose-structure changes only (new service, changed labels/ports) --
# ordinary code changes just produce a new image and are picked up by
# Watchtower on its own; this is deliberately NOT wired into CI, to keep
# zero deploy credentials in GitHub Actions.
deploy-preprod:
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-preprod -f infra/preprod/compose.yaml \
		--env-file infra/preprod/.env up -d"

deploy-prod:
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-prod -f infra/prod/compose.yaml \
		--env-file infra/prod/.env up -d"
