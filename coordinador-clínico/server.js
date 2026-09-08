import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow any origin since this is a local development server
    methods: ["GET", "POST"]
  }
});

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize empty DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    projects: [],
    patients: [],
    appointments: []
  }));
}

function readData() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return { projects: [], patients: [], appointments: [] };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
  }
}

app.use(express.static(path.join(__dirname, 'dist')));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current data to newly connected client
  socket.emit('initial_data', readData());

  socket.on('update_data', (newData) => {
    // Write new data to file
    writeData(newData);
    
    // Broadcast to all OTHER connected clients
    socket.broadcast.emit('data_updated', newData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Synchronization server running on http://localhost:${PORT}`);
  console.log(`Access it from your phone using your computer's local IP address (e.g., http://192.168.1.X:3000)`);
});
