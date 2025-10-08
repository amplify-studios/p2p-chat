DIST=dist
.DEFAULT_GOAL := help

.PHONY: start
start: ## Start the server
	sudo docker-compose up -d --remove-orphans

.PHONY: stop
stop: ## Stop the server
	sudo docker-compose down

.PHONY: rebuild
rebuild: ## Rebuild docker image
	sudo docker-compose build

.PHONY: logs
logs: ## Print logs
	sudo docker-compose logs -f

.PHONY: clean
clean: ## Clean docker environment
	sudo docker system prune -f

.PHONY: dist
dist: ## Create a distribution directory
	mkdir -p $(DIST)
	cp -r ./src/public/* $(DIST)
	cp -r ./src/php $(DIST)
	cp ./src/config.json $(DIST)/config.json

.PHONY: distclean
distclean: ## Clean the distribution
	rm -rf $(DIST)

.PHONY: help
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
