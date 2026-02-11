#!/bin/bash

# Configuration
APP_DIR="/home/ec2-user/uwb-device-360"
BACKUP_DIR="/home/ec2-user/backups/analytics"
DB_FILE="analytics.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
if [ -f "$APP_DIR/$DB_FILE" ]; then
    cp "$APP_DIR/$DB_FILE" "$BACKUP_DIR/${DB_FILE}_${TIMESTAMP}"
    echo "Backup created: $BACKUP_DIR/${DB_FILE}_${TIMESTAMP}"
else
    echo "Error: Database file not found at $APP_DIR/$DB_FILE"
    exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "${DB_FILE}_*" -type f -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days."
