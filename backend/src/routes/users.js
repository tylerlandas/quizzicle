const { Router } = require('express');
const User = require('../models/User');

const router = Router();

console.error('In users route');

// Leaderboard — all users sorted by totalScore desc
router.get('/leaderboard', async (_req, res) => {
  console.error('In leaderboard route');

  try {
    const users = await User.find({}, 'name totalScore gamesPlayed')
      .sort({ totalScore: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login or register user
router.post('/login', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const trimmedName = name.trim();
    let user = await User.findOne({ name: trimmedName });
    const isNew = !user;

    if (!user) {
      user = new User({ name: trimmedName });
      await user.save();
    }

    res.json({ user, isNew });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user score and answered questions after quitting
router.patch('/:id/score', async (req, res) => {
  try {
    const { score, questionsAnswered } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { totalScore: score, gamesPlayed: 1 },
        $addToSet: { questionsAnswered: { $each: questionsAnswered } },
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Update score error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences (e.g. soundEnabled)
router.patch('/:id/preferences', async (req, res) => {
  try {
    const { soundEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { soundEnabled },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
