# Shopiva — convenience targets (npm scripts are the primary entrypoint).
# If `make` is not installed, use the npm equivalents shown next to each target.

.PHONY: up dev down logs ps rebuild clean db-push db-studio help

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up:             ## Build + start the stack detached  (npm run up)
	docker compose up -d --build

dev:            ## Build + start the stack in foreground  (npm start)
	docker compose up --build

down:           ## Stop the stack  (npm run down)
	docker compose down

logs:           ## Tail backend/frontend logs  (npm run logs)
	docker compose logs -f backend frontend

ps:             ## Show running containers  (npm run ps)
	docker compose ps

rebuild:        ## Rebuild images without cache  (npm run rebuild)
	docker compose build --no-cache

db-push:        ## Sync Drizzle schema to the DB  (npm run db:push)
	docker compose exec backend npm run db:push

db-studio:      ## Open Drizzle Studio on http://localhost:3001  (npm run db:studio)
	docker compose exec backend npm run db:studio

clean:          ## Stop the stack AND delete data volumes (destructive!)
	docker compose down -v
