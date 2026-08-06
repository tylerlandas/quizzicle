const { Router } = require('express');
const mongoose = require('mongoose');
const Question = require('../models/Question');

const router = Router();

// Get random questions, optionally excluding already-seen ones
router.get('/random', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 20);
    const excludeStr = req.query.exclude;

    const excludeIds =
      excludeStr
        ? excludeStr
            .split(',')
            .filter((id) => mongoose.isValidObjectId(id))
            .map((id) => new mongoose.Types.ObjectId(id))
        : [];

    const matchStage =
      excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {};

    const questions = await Question.aggregate([
      { $match: matchStage },
      { $sample: { size: count } },
    ]);

    res.json(questions);
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
