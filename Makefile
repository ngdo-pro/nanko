VPS ?= nanko-vps
REMOTE_DIR ?= nanko

.PHONY: dev stop logs deploy-preprod deploy-prod

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
