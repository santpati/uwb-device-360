#!/bin/bash

LOG_FILE="/home/ec2-user/system_monitor.log"

echo "timestamp,load_avg_1m,free_mem_mb,node_cpu,node_mem_mb" >> $LOG_FILE

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # System Load (1 min average)
  LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | awk -F',' '{ print $1 }' | xargs)
  
  # Free Memory (MB)
  FREE_MEM=$(free -m | grep Mem | awk '{print $4}')
  
  # Node Process Stats (assuming process name contains 'next' or 'uwb')
  # This grabs the top CPU consuming node process
  NODE_STATS=$(ps -eo comm,pcpu,rss | grep node | sort -k2 -r | head -n 1)
  NODE_CPU=$(echo $NODE_STATS | awk '{print $2}')
  NODE_MEM_KB=$(echo $NODE_STATS | awk '{print $3}')
  
  if [ -z "$NODE_MEM_KB" ]; then
    NODE_MEM_MB=0
    NODE_CPU=0
  else
    NODE_MEM_MB=$((NODE_MEM_KB / 1024))
  fi

  echo "$TIMESTAMP, $LOAD, $FREE_MEM, $NODE_CPU, $NODE_MEM_MB" >> $LOG_FILE
  
  # Check every 10 seconds
  sleep 10
done
