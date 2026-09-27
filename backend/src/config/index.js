require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  syncBroadcastIntervalMs: 5000, // host se har 5s me time-sync broadcast hota hai
  syncDriftThresholdSec: 0.6,    // isse zyada drift hone par player hard-seek karega
};
