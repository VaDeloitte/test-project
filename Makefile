include .env

.PHONY: all

build:
	docker build -t Genie-ui .

run:
	export $(cat .env | xargs)
	docker stop Genie-ui || true && docker rm Genie-ui || true
	docker run --name Genie-ui --rm -e OPENAI_API_KEY=${OPENAI_API_KEY} -p 3000:3000 Genie-ui

logs:
	docker logs -f Genie-ui

push:
	docker tag Genie-ui:latest ${DOCKER_USER}/Genie-ui:${DOCKER_TAG}
	docker push ${DOCKER_USER}/Genie-ui:${DOCKER_TAG}