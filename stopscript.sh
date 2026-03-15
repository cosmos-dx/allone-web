#!/bin/bash

echo "Stopping all services..."

# Kill processes on port 3000 (frontend)
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "Stopping frontend on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✓ Frontend stopped"
else
    echo "No process found on port 3000"
fi

# Kill processes on port 8000 (backend)
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "Stopping backend on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    echo "✓ Backend stopped"
else
    echo "No process found on port 8000"
fi

echo ""
echo "All services stopped!"

