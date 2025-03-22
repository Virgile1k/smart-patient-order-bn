import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app, { connectDB } from './app.js';
// Import the patient generator service
import { startPatientGeneratorService, stopPatientGeneratorService } from '../patientGeneratorService.js';

dotenv.config();

const { PORT } = process.env;

const server = http.createServer(app);

// Configure Socket.IO with detailed CORS settings
const io = new Server(server, {
  cors: {
    origin: ["https://develop.d25dp759okci7n.amplifyapp.com", "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    transports: ['websocket', 'polling'],
  },
  allowEIO3: true, // Allow compatibility with Socket.IO v2 clients
  pingTimeout: 60000, // Increase ping timeout for slower connections
});

// Authenticated namespace (default)
io.on('connection', (socket) => {
  console.log('A user connected to default namespace:', socket.id);

  socket.on('customEvent', (data) => {
    console.log('Custom event received:', data);
    io.emit('update', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from default namespace:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error in default namespace:', error);
  });
});

// Public namespace for hospital display with explicit CORS settings
const publicIo = io.of('/public');
publicIo.use((socket, next) => {
  // You could add additional middleware for the public namespace here
  next();
});

publicIo.on('connection', (socket) => {
  console.log('Public display connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Public display disconnected:', socket.id);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error in public namespace:', error);
  });
});

// Event queue for handling simultaneous emissions
const eventQueue = [];
let isProcessing = false;

const processEventQueue = async () => {
  if (isProcessing || eventQueue.length === 0) return;
  isProcessing = true;

  while (eventQueue.length > 0) {
    const { event, data } = eventQueue.shift();
    publicIo.emit(event, data);
    console.log(`Emitted ${event} to /public:`, data);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid flooding
  }

  isProcessing = false;
};

export const emitPublicEvent = (event, data) => {
  eventQueue.push({ event, data });
  processEventQueue();
};

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT || 5000, () => {
      console.log(`🍏 Server is running on: http://localhost:${PORT || 5000} ... 🌊`);
      
      // Start the patient generator service when the server starts
      startPatientGeneratorService();
    });
  } catch (err) {
    console.error(`❌ Error starting the server: ${err}`);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Gracefully shutting down server...');
  
  // Stop the patient generator service
  stopPatientGeneratorService();
  
  // Close the server
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop the patient generator service
  stopPatientGeneratorService();
  
  // Close the server
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

startServer();

export { io };