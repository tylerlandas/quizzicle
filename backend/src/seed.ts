import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question';

dotenv.config();

const questions = [
  // ── History ──────────────────────────────────────────────────────────────
  {
    text: 'Who was the first President of the United States?',
    options: ['John Adams', 'George Washington', 'Thomas Jefferson', 'Benjamin Franklin'],
    correctAnswer: 1,
    category: 'History',
    difficulty: 'easy',
  },
  {
    text: 'In what year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: 2,
    category: 'History',
    difficulty: 'easy',
  },
  {
    text: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Botticelli'],
    correctAnswer: 2,
    category: 'History',
    difficulty: 'easy',
  },
  {
    text: 'In what year did humans first land on the Moon?',
    options: ['1965', '1967', '1969', '1971'],
    correctAnswer: 2,
    category: 'History',
    difficulty: 'easy',
  },
  {
    text: 'Who was the first woman to win a Nobel Prize?',
    options: ['Rosalind Franklin', 'Marie Curie', 'Dorothy Hodgkin', 'Lise Meitner'],
    correctAnswer: 1,
    category: 'History',
    difficulty: 'medium',
  },
  {
    text: 'In what year was the Berlin Wall torn down?',
    options: ['1987', '1988', '1989', '1990'],
    correctAnswer: 2,
    category: 'History',
    difficulty: 'medium',
  },
  // ── Science ───────────────────────────────────────────────────────────────
  {
    text: 'What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 2,
    category: 'Science',
    difficulty: 'easy',
  },
  {
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Jupiter', 'Saturn', 'Mars'],
    correctAnswer: 3,
    category: 'Science',
    difficulty: 'easy',
  },
  {
    text: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'],
    correctAnswer: 2,
    category: 'Science',
    difficulty: 'easy',
  },
  {
    text: 'How many bones are in the adult human body?',
    options: ['186', '196', '206', '216'],
    correctAnswer: 2,
    category: 'Science',
    difficulty: 'medium',
  },
  {
    text: 'What is the atomic number of carbon?',
    options: ['4', '6', '8', '12'],
    correctAnswer: 1,
    category: 'Science',
    difficulty: 'medium',
  },
  {
    text: 'Which gas do plants primarily absorb during photosynthesis?',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
    correctAnswer: 2,
    category: 'Science',
    difficulty: 'easy',
  },
  // ── Pop Culture ───────────────────────────────────────────────────────────
  {
    text: "Which band recorded 'Bohemian Rhapsody'?",
    options: ['The Beatles', 'Led Zeppelin', 'Queen', 'The Rolling Stones'],
    correctAnswer: 2,
    category: 'Pop Culture',
    difficulty: 'easy',
  },
  {
    text: 'Who played Iron Man in the Marvel Cinematic Universe?',
    options: ['Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo', 'Robert Downey Jr.'],
    correctAnswer: 3,
    category: 'Pop Culture',
    difficulty: 'easy',
  },
  {
    text: 'Who wrote the Harry Potter series?',
    options: ['Stephenie Meyer', 'J.R.R. Tolkien', 'J.K. Rowling', 'C.S. Lewis'],
    correctAnswer: 2,
    category: 'Pop Culture',
    difficulty: 'easy',
  },
  {
    text: 'Which TV show features Sheldon Cooper and Leonard Hofstadter?',
    options: ['Friends', 'The Big Bang Theory', 'Two and a Half Men', 'How I Met Your Mother'],
    correctAnswer: 1,
    category: 'Pop Culture',
    difficulty: 'easy',
  },
  {
    text: "Which artist released the album 'Thriller'?",
    options: ['Prince', 'Michael Jackson', 'Elton John', 'David Bowie'],
    correctAnswer: 1,
    category: 'Pop Culture',
    difficulty: 'easy',
  },
  {
    text: 'What is the best-selling video game franchise of all time?',
    options: ['Grand Theft Auto', 'Call of Duty', 'Mario', 'Minecraft'],
    correctAnswer: 2,
    category: 'Pop Culture',
    difficulty: 'medium',
  },
  // ── Geography ─────────────────────────────────────────────────────────────
  {
    text: 'What is the capital city of Australia?',
    options: ['Sydney', 'Melbourne', 'Brisbane', 'Canberra'],
    correctAnswer: 3,
    category: 'Geography',
    difficulty: 'medium',
  },
  {
    text: 'What is the longest river in the world?',
    options: ['Amazon', 'Yangtze', 'Mississippi', 'Nile'],
    correctAnswer: 3,
    category: 'Geography',
    difficulty: 'medium',
  },
  {
    text: 'What is the smallest country in the world by area?',
    options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'],
    correctAnswer: 2,
    category: 'Geography',
    difficulty: 'medium',
  },
  {
    text: 'Which continent is the largest by land area?',
    options: ['Africa', 'North America', 'Asia', 'Europe'],
    correctAnswer: 2,
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    text: 'What is the highest mountain in the world?',
    options: ['K2', 'Mount Everest', 'Mont Blanc', 'Kilimanjaro'],
    correctAnswer: 1,
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    text: 'In which country would you find the ancient city of Machu Picchu?',
    options: ['Brazil', 'Colombia', 'Chile', 'Peru'],
    correctAnswer: 3,
    category: 'Geography',
    difficulty: 'medium',
  },
  // ── Technology ────────────────────────────────────────────────────────────
  {
    text: 'Who co-founded Apple with Steve Jobs?',
    options: ['Bill Gates', 'Steve Wozniak', 'Paul Allen', 'Jeff Bezos'],
    correctAnswer: 1,
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    text: 'What does HTTP stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Tech Transfer Process',
      'HyperText Transmission Program',
      'High Transfer Text Protocol',
    ],
    correctAnswer: 0,
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    text: 'In what year was the World Wide Web invented by Tim Berners-Lee?',
    options: ['1983', '1986', '1989', '1993'],
    correctAnswer: 2,
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    text: 'Who created the Linux kernel?',
    options: ['Richard Stallman', 'Dennis Ritchie', 'Ken Thompson', 'Linus Torvalds'],
    correctAnswer: 3,
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    text: "What does 'GPU' stand for?",
    options: [
      'General Processing Unit',
      'Graphics Processing Unit',
      'Global Performance Unit',
      'Graphical Program Utility',
    ],
    correctAnswer: 1,
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    text: 'Which company developed the JavaScript programming language?',
    options: ['Microsoft', 'Google', 'Netscape', 'Sun Microsystems'],
    correctAnswer: 2,
    category: 'Technology',
    difficulty: 'medium',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizzicle';
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    await Question.deleteMany({});
    console.log('Cleared existing questions');

    await Question.insertMany(questions);
    console.log(`Seeded ${questions.length} questions successfully!`);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
