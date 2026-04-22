import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  totalScore: number;
  questionsAnswered: string[];
  gamesPlayed: number;
  soundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    totalScore: { type: Number, default: 0 },
    questionsAnswered: [{ type: String }],
    gamesPlayed: { type: Number, default: 0 },
    soundEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
