const { Router } = require('express');
const GameSession = require('../models/GameSession');

const router = Router();

// Save a completed game session
router.post('/', async (req, res) => {
  try {
    const { userId, userName, questionsAsked, correctAnswers, wrongAnswers, score } = req.body;

    const session = new GameSession({
      userId,
      userName,
      questionsAsked,
      correctAnswers,
      wrongAnswers,
      score,
    });

    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent sessions for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const sessions = await GameSession.find({ userId: req.params.userId })
      .sort({ completedAt: -1 })
      .limit(10);

    res.json(sessions);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
