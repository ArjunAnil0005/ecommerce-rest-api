const mongoose = require('mongoose');

async function getReadiness(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is not ready',
    });
  }

  try {
    const result = await mongoose.connection.db.admin().ping();
    if (result.ok !== 1) throw new Error('Database ping did not succeed');
  } catch (error) {
    console.warn(
      `Database readiness check failed for request ${req.id}: ${error.message}`,
    );
    return res.status(503).json({
      success: false,
      message: 'Database is not ready',
    });
  }

  return res.status(200).json({
    success: true,
    data: { status: 'ready' },
  });
}

module.exports = { getReadiness };
