// backend/routes/health.routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', async (req, res) => {
  try {
    // Check database
    await mongoose.connection.db.admin().ping();
    
    res.status(200).json({
      success: true,
      message: 'Service is ready',
      checks: {
        database: 'healthy',
        server: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service not ready',
      checks: {
        database: 'unhealthy',
        error: error.message
      }
    });
  }
});

module.exports = router;