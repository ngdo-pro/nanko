VPS ?= nanko-vps
REMOTE_DIR ?= nanko

.PHONY: deploy-preprod deploy-prod

# Compose-structure changes only (new service, changed labels/ports) --
# ordinary code changes just produce a new image and are picked up by
# Watchtower on its own; this is deliberately NOT wired into CI, to keep
# zero deploy credentials in GitHub Actions.
deploy-preprod:
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-preprod -f infra/preprod/docker-compose.yml \
		--env-file infra/preprod/.env up -d"

deploy-prod:
	ssh $(VPS) "cd $(REMOTE_DIR) && git pull --ff-only && \
		docker compose -p nanko-prod -f infra/prod/docker-compose.yml \
		--env-file infra/prod/.env up -d"
