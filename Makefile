.PHONY: dev build test migrate seed backup restore

dev:
	docker compose up --build

build:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

test:
	cd backend && npm test

migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npm run seed

backup:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backup /scripts/backup.sh

restore:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backup /scripts/restore.sh /backups/$(FILE)
