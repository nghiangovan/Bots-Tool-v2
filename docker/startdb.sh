#!/bin/bash

docker-compose up -d

sleep 5

docker exec bot-tool-mongodb /scripts/rs-init.sh