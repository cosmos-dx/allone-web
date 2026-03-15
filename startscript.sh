#!/bin/bash

# AllOne Start Script
# Kills processes on ports 3000 and 8000, then starts frontend and backend

echo "🚀 Starting AllOne Development Servers..."
echo ""

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "🛑 Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
        sleep 1
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill processes on ports 3000 and 8000
echo "📋 Checking and cleaning ports..."
kill_port 3000
kill_port 8000
echo ""

# Wait a moment for ports to be fully released
sleep 1

# Get the script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Start backend server
echo "🔧 Starting backend server on port 8000..."
cd "$SCRIPT_DIR" || exit 1
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend started (PID: $BACKEND_PID)"
echo "   Logs: $SCRIPT_DIR/backend.log"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🎨 Starting frontend server on port 3000..."
cd "$SCRIPT_DIR/frontend" || exit 1
npm start > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend started (PID: $FRONTEND_PID)"
echo "   Logs: $SCRIPT_DIR/frontend.log"
echo ""

# Wait a moment for frontend to start
sleep 3

# Check if servers are running
echo "🔍 Checking server status..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:8000"
else
    echo "⚠️  Backend may still be starting..."
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on http://localhost:3000"
else
    echo "⚠️  Frontend may still be starting..."
fi

echo ""
echo "📝 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📋 To stop servers, run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📄 To view logs:"
echo "   tail -f backend.log    # Backend logs"
echo "   tail -f frontend.log    # Frontend logs"
echo ""
echo "✨ Servers are starting! Check the logs if needed."
echo ""

# Save PIDs to a file for easy stopping
cd "$SCRIPT_DIR" || exit 1
echo "$BACKEND_PID $FRONTEND_PID" > .server_pids
echo "💾 PIDs saved to .server_pids"

