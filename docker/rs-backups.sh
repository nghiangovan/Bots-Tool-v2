#!/bin/bash
mongodump --host=127.0.0.1 --port=27017 --db=bots_tool_data --gzip --archive=backups/backup-$(date '+%Y-%m-%d_%H-%M-%S').gzip