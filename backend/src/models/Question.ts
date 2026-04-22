import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  text: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const QuestionSchema: Schema = new Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  category: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
});

export default mongoose.model<IQuestion>('Question', QuestionSchema);
