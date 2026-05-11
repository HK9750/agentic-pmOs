API_DIR := apps/api

.PHONY: compose-up compose-down migrate api worker api-test web-dev web-build format

compose-up:
	docker compose up -d postgres redis

compose-down:
	docker compose down

migrate:
	cd $(API_DIR) && MIGRATIONS_DIR=migrations go run ./cmd/migrate

api:
	cd $(API_DIR) && go run ./cmd/api

worker:
	cd $(API_DIR) && go run ./cmd/worker

api-test:
	cd $(API_DIR) && go test ./...

web-dev:
	npm --workspace apps/web run dev

web-build:
	npm --workspace apps/web run build

format:
	cd $(API_DIR) && gofmt -w ./cmd ./internal
