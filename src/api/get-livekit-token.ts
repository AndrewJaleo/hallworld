// This would typically be in your backend server
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { room, username } = req.body;
    
    if (!room || !username) {
      return res.status(400).json({ error: 'Missing room or username' });
    }

    // Create a new token
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit configuration missing' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
    });
    
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    
    const token = at.toJwt();
    
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}
