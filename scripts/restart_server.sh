#!/bin/bash

# Function to find Phoenix server PID
find_phoenix_pid() {
    # Look for the beam.smp process running mix geo.start or mix phx.server
    ps aux | grep -E "[b]eam.smp.*(mix geo.start|mix phx.server)" | awk '{print $2}' | head -1
}

# Find the current Phoenix server PID
PID=$(find_phoenix_pid)

if [ -z "$PID" ]; then
    echo "Phoenix server is not running. Starting it now..."
    mix geo.start
else
    echo "Found Phoenix server running with PID: $PID"
    echo "Stopping Phoenix server..."
    
    # Kill the Phoenix server
    kill -TERM $PID
    
    # Wait for the process to stop
    sleep 2
    
    # Force kill if still running
    if kill -0 $PID 2>/dev/null; then
        echo "Force stopping Phoenix server..."
        kill -9 $PID
        sleep 1
    fi
    
    echo "Starting Phoenix server..."
    mix geo.start
fi 