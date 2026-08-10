.DEFAULT_GOAL := help

.PHONY: help dev stop

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
