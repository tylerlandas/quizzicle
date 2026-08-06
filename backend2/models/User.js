const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    totalScore: { type: Number, default: 0 },
    questionsAnswered: [{ type: String }],
    gamesPlayed: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
