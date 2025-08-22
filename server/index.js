import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Function to create a LiveKit token
const createToken = async (roomName, participantId, participantName) => {
  // Check if API key and secret are available
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API key or secret is missing');
  }

  // Create a new access token
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantId,
      name: participantName,
      // Token to expire after 24 hours
      ttl: '24h',
    }
  );

  // Add permissions to the token
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true
  });

  // Generate and return the JWT token
  return at.toJwt();
};

// Route to get a token
app.post('/api/get-livekit-token', async (req, res) => {
  try {
    const { room, username, name } = req.body;

    if (!room || !username) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide room and username.' 
      });
    }

    // Generate the token
    const token = await createToken(room, username, name || username.substring(0, 10));

    // Return the token
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('LiveKit Token Server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`LiveKit API Key: ${process.env.LIVEKIT_API_KEY ? 'Available' : 'Missing'}`);
  console.log(`LiveKit API Secret: ${process.env.LIVEKIT_API_SECRET ? 'Available' : 'Missing'}`);
});
