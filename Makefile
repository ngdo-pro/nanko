.DEFAULT_GOAL := help

.PHONY: help init start stop down clean dev migrate seed studio test lint typecheck format format-check build status logs

help: ## Liste les commandes disponibles
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

init: ## Setup complet premiere fois : .env.local, services Docker, deps, migrations
	@test -f .env.local || cp .env.example .env.local
	docker compose up -d postgres jaeger
	pnpm install
	pnpm db:migrate
	@echo ""
	@echo "Setup termine. 'make dev' pour lancer le serveur (ou 'pnpm db:seed' pour des donnees de demo avant)."

start: ## Demarre les services Docker (postgres, jaeger) en arriere-plan
	docker compose up -d postgres jaeger

stop: ## Arrete les services Docker (containers supprimes, donnees conservees)
	docker compose down

clean: ## Arrete les services Docker ET supprime les donnees (destructif)
	docker compose down -v

dev: ## Lance le serveur de dev Next.js (necessite 'make start' avant)
	pnpm dev

migrate: ## Applique les migrations Drizzle a la DB de dev
	pnpm db:migrate

seed: ## Charge un jeu de donnees de demo
	pnpm db:seed

studio: ## Ouvre Drizzle Studio (explorateur de donnees)
	pnpm db:studio

test: ## Lance les tests (vitest, contre TEST_DATABASE_URL)
	pnpm test

lint: ## Lint le code
	pnpm lint

typecheck: ## Verifie les types TypeScript
	pnpm typecheck

format: ## Formatte le code (prettier --write)
	pnpm format

format-check: ## Verifie le formatage sans modifier (utilise en CI)
	pnpm format:check

build: ## Build de production Next.js
	pnpm build

status: ## Etat des containers Docker du projet
	docker compose ps

logs: ## Suit les logs des containers Docker (Ctrl+C pour quitter)
	docker compose logs -f
