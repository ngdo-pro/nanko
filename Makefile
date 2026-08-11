.DEFAULT_GOAL := help

.PHONY: help dev stop test unit-test functional-test test-db test-e2e phpstan

help: ## Liste les commandes disponibles
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Démarre tout : hub Mercure (Docker), backend Symfony, frontend Vite (au premier plan)
	docker compose up -d
	cd apps/api && symfony server:start --port=8000 --no-tls -d
	pnpm --filter ./apps/web dev

stop: ## Arrête tout : frontend Vite, backend Symfony, hub Mercure
	pkill -f "vite" 2>/dev/null || true
	cd apps/api && symfony server:stop
	docker compose down

test: unit-test functional-test ## Lance tous les tests api (unit + functional) + web — nécessite `make test-db` au préalable
	pnpm --filter web test

unit-test: ## Lance les tests unitaires api (rapide, aucune dépendance externe)
	cd apps/api && php bin/phpunit tests/Unit

functional-test: ## Lance les tests fonctionnels api — nécessite `make test-db` au préalable
	cd apps/api && php bin/phpunit tests/Functional

test-db: ## (Re)crée la base de test et joue les migrations (à relancer après chaque nouvelle migration)
	cd apps/api && php bin/console --env=test doctrine:database:drop --force --if-exists
	cd apps/api && php bin/console --env=test doctrine:database:create
	cd apps/api && php bin/console --env=test doctrine:migrations:migrate --no-interaction

test-e2e: ## Lance les tests e2e Playwright (nécessite `make dev` en parallèle dans un autre terminal)
	pnpm --filter ./apps/e2e exec playwright test

phpstan: ## Analyse statique api (niveau max)
	cd apps/api && php bin/console cache:warmup --env=dev
	cd apps/api && vendor/bin/phpstan analyse
