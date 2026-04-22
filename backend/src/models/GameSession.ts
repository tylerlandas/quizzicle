import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  questionsAsked: string[];
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  completedAt: Date;
}

const GameSessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  questionsAsked: [{ type: String }],
  correctAnswers: { type: Number, default: 0 },
  wrongAnswers: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IGameSession>('GameSession', GameSessionSchema);
