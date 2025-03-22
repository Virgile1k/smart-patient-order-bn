import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import router from './routes/index.routes.js';

const app = express();

// Detailed CORS configuration
const corsOptions = {
  origin: ["https://develop.d25dp759okci7n.amplifyapp.com", "http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send(
    `<h1 style="text-align: center; color: #CCD6F6; margin-top: 20vh; background: #0A192F; padding: 150px;">Welcome to SMART Patient System API!</h1>`
  );
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const connectDB = async () => {
  try {
    console.log('🟢 Firebase connection established successfully');
  } catch (err) {
    console.error(`❌ Firebase connection failed: ${err}`);
    process.exit(1);
  }
};

app.use('/api/v1', router);

export default app;