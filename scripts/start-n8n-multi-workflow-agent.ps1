# Start n8n Multi-Workflow Agent Backend Server

# Navigate to project root
cd ..

# Start the Node.js express server using ts-node
echo "Starting n8n Multi-Workflow backend proxy on port 3459..."
npx ts-node src/agent/n8n-multi-workflow/n8n-multi-workflow-server.ts
