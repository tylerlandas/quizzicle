/**
 * UI Tests — Quizzicle
 *
 * Covers functional user-facing behaviors not tested by accessibility.spec.ts:
 *  · Name entry: placeholder, button text, whitespace-only validation, CSS error class, default sound
 *  · Phase transitions: name-entry → playing; playing → feedback → playing; playing → round-results
 *  · Content: player name display, score display, question text, option text, category/difficulty badges
 *  · Progress label: visual "Question N / 5" text advances with each answer
 *  · Score tracking: +10 on correct, unchanged on wrong, accumulates across questions
 *  · Round results (all wrong): correct/wrong counts, accuracy %, verdict text, score breakdown
 *  · Round results (all correct): counts, accuracy %, "Flawless victory" verdict, score breakdown
 *  · Continue: "Another Round!" reloads questions (with exclude IDs) and returns to playing
 *  · Quit: "Save & Quit" calls POST /api/sessions + PATCH /api/users/:id/score, returns to name-entry
 *  · Returning user: previously-answered IDs sent as exclude param in questions request
 *  · Leaderboard: entry names, scores, rank order, close button hides modal
 *  · Error recovery: login failure shows message text; dismissal restores form; questions failure returns to name-entry
 *
 * All network calls are intercepted via page.route() – no real backend needed.
 * Run: npx playwright test tests/ui.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ── Mock fixtures ──────────────────────────────────────────────────────────

const MOCK_USER = {
  _id: 'user123',
  name: 'Tester',
  totalScore: 100,
  questionsAnswered: [] as string[],
  gamesPlayed: 2,
  soundEnabled: false,
};

const MOCK_QUESTIONS = [
  {
    _id: 'q1',
    text: 'Which planet is closest to the Sun?',
    options: ['Venus', 'Mercury', 'Mars', 'Earth'],
    correctAnswer: 1,
    category: 'Science',
    difficulty: 'easy',
  },
  {
    _id: 'q2',
    text: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctAnswer: 2,
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    _id: 'q3',
    text: 'Who wrote Hamlet?',
    options: ['Dickens', 'Austen', 'Marlowe', 'Shakespeare'],
    correctAnswer: 3,
    category: 'Literature',
    difficulty: 'medium',
  },
  {
    _id: 'q4',
    text: 'How many sides does an octagon have?',
    options: ['6', '7', '8', '9'],
    correctAnswer: 2,
    category: 'Math',
    difficulty: 'hard',
  },
  {
    _id: 'q5',
    text: 'What is the chemical symbol for water?',
    options: ['CO2', 'H2O', 'NaCl', 'O2'],
    correctAnswer: 1,
    category: 'Chemistry',
    difficulty: 'easy',
  },
];

const MOCK_LEADERBOARD = [
  { _id: 'u1', name: 'Alice', totalScore: 500, gamesPlayed: 10 },
  { _id: 'u2', name: 'Bob', totalScore: 420, gamesPlayed: 8 },
  { _id: 'u3', name: 'Carol', totalScore: 380, gamesPlayed: 7 },
  { _id: 'u4', name: 'Dave', totalScore: 200, gamesPlayed: 5 },
];

// ── API route helpers ──────────────────────────────────────────────────────

async function setupAPIRoutes(page: Page, userOverride: Partial<typeof MOCK_USER> = {}): Promise<void> {
  const user = { ...MOCK_USER, ...userOverride };
  await page.route('**/api/users/login', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user, isNew: false }),
    })
  );
  await page.route('**/api/questions/random**', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_QUESTIONS),
    })
  );
  await page.route('**/api/sessions', async route =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/api/users/*/score', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  );
  await page.route('**/api/users/*/preferences', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  );
  await page.route('**/api/users/leaderboard', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LEADERBOARD),
    })
  );
}

// ── Phase navigation helpers ───────────────────────────────────────────────

async function goToNameEntry(page: Page): Promise<void> {
  await setupAPIRoutes(page);
  await page.goto('/');
  await page.waitForSelector('.name-entry-card');
}

async function goToPlaying(page: Page, userOverride: Partial<typeof MOCK_USER> = {}): Promise<void> {
  await setupAPIRoutes(page, userOverride);
  await page.goto('/');
  await page.fill('input[type="text"]', 'Tester');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.question-card');
}

async function answerAndContinue(page: Page, optionIndex: number): Promise<void> {
  await page.locator('.option-btn').nth(optionIndex).click();
  await page.waitForSelector('[role="dialog"]');
  await page.click('button[aria-label="Continue to next question"]');
}

/** Answers all 5 questions by clicking the first option (all wrong for MOCK_QUESTIONS). */
async function goToRoundResults(page: Page): Promise<void> {
  await goToPlaying(page);
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('.question-card');
    await page.locator('.option-btn').first().click();
    await page.waitForSelector('[role="dialog"]');
    await page.click('button[aria-label="Continue to next question"]');
  }
  await page.waitForSelector('.results-card');
}

/** Answers all 5 questions using the correct option for each. */
async function goToRoundResultsAllCorrect(page: Page): Promise<void> {
  await goToPlaying(page);
  for (const q of MOCK_QUESTIONS) {
    await page.waitForSelector('.question-card');
    await page.locator('.option-btn').nth(q.correctAnswer).click();
    await page.waitForSelector('[role="dialog"]');
    await page.click('button[aria-label="Continue to next question"]');
  }
  await page.waitForSelector('.results-card');
}

// ══════════════════════════════════════════════════════════════════════════
// 1 · NAME ENTRY — FORM BEHAVIOR
// ══════════════════════════════════════════════════════════════════════════

test.describe('Name Entry — Form Behavior', () => {
  test.beforeEach(({ page }) => goToNameEntry(page));

  test('submit button reads "Let\'s Play!" when idle', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toHaveText("Let's Play!");
  });

  test('name input has placeholder text', async ({ page }) => {
    await expect(page.locator('input[type="text"]')).toHaveAttribute('placeholder', 'Enter your name…');
  });

  test('whitespace-only name shows validation error', async ({ page }) => {
    await page.fill('input[type="text"]', '   ');
    await page.click('button[type="submit"]');
    await expect(page.locator('.form-error')).toBeVisible();
    await expect(page.locator('.form-error')).toContainText('Please enter your name');
  });

  test('invalid submit applies error CSS class to input', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('input[type="text"]')).toHaveClass(/form-input--error/);
  });

  test('sound effects checkbox is checked by default before login', async ({ page }) => {
    // App initialises soundEnabled=true; the name-entry checkbox reflects this before any login
    await expect(page.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('leaderboard button is visible on name-entry screen', async ({ page }) => {
    await expect(page.locator('button.leaderboard-btn')).toBeVisible();
    await expect(page.locator('button.leaderboard-btn')).toContainText('Leaderboard');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2 · PLAYING PHASE — CONTENT DISPLAY
// ══════════════════════════════════════════════════════════════════════════

test.describe('Playing Phase — Content Display', () => {
  test.beforeEach(({ page }) => goToPlaying(page));

  test('player name shown in question card top bar', async ({ page }) => {
    await expect(page.locator('.qcard-player')).toContainText('Tester');
  });

  test('score starts at "0 pts"', async ({ page }) => {
    await expect(page.locator('.qcard-score')).toContainText('0 pts');
  });

  test('question text renders from data', async ({ page }) => {
    await expect(page.locator('.question-text')).toHaveText(MOCK_QUESTIONS[0].text);
  });

  test('all four answer option texts render correctly', async ({ page }) => {
    const options = page.locator('.option-text');
    for (let i = 0; i < MOCK_QUESTIONS[0].options.length; i++) {
      await expect(options.nth(i)).toHaveText(MOCK_QUESTIONS[0].options[i]);
    }
  });

  test('category badge shows correct category', async ({ page }) => {
    await expect(page.locator('.badge-category')).toContainText(MOCK_QUESTIONS[0].category);
  });

  test('difficulty badge shown for first question', async ({ page }) => {
    await expect(page.locator('.badge-difficulty')).toBeVisible();
    await expect(page.locator('.badge-difficulty')).toContainText('Easy');
  });

  test('progress label shows "Question 1 / 5" on first question', async ({ page }) => {
    await expect(page.locator('.progress-label')).toHaveText('Question 1 / 5');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3 · SCORE TRACKING
// ══════════════════════════════════════════════════════════════════════════

test.describe('Score Tracking', () => {
  test('correct answer increments score by 10', async ({ page }) => {
    await goToPlaying(page);
    await page.locator('.option-btn').nth(MOCK_QUESTIONS[0].correctAnswer).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('.qcard-score')).toContainText('10 pts');
  });

  test('wrong answer leaves score at 0', async ({ page }) => {
    await goToPlaying(page);
    // First option (Venus) is wrong for q1
    await page.locator('.option-btn').first().click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('.qcard-score')).toContainText('0 pts');
  });

  test('score accumulates across two consecutive correct answers', async ({ page }) => {
    await goToPlaying(page);
    // Answer q1 correctly
    await page.locator('.option-btn').nth(MOCK_QUESTIONS[0].correctAnswer).click();
    await page.waitForSelector('[role="dialog"]');
    await page.click('button[aria-label="Continue to next question"]');
    // Answer q2 correctly
    await page.waitForSelector('.question-card');
    await page.locator('.option-btn').nth(MOCK_QUESTIONS[1].correctAnswer).click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('.qcard-score')).toContainText('20 pts');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 4 · QUESTION PROGRESSION
// ══════════════════════════════════════════════════════════════════════════

test.describe('Question Progression', () => {
  test('progress label advances to "Question 2 / 5" after first answer', async ({ page }) => {
    await goToPlaying(page);
    await answerAndContinue(page, 0);
    await page.waitForSelector('.question-card');
    await expect(page.locator('.progress-label')).toHaveText('Question 2 / 5');
  });

  test('question text changes when advancing to the next question', async ({ page }) => {
    await goToPlaying(page);
    await expect(page.locator('.question-text')).toHaveText(MOCK_QUESTIONS[0].text);
    await answerAndContinue(page, 0);
    await page.waitForSelector('.question-card');
    await expect(page.locator('.question-text')).toHaveText(MOCK_QUESTIONS[1].text);
  });

  test('progress label shows "Question 5 / 5" on the final question', async ({ page }) => {
    await goToPlaying(page);
    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('.question-card');
      await answerAndContinue(page, 0);
    }
    await expect(page.locator('.progress-label')).toHaveText('Question 5 / 5');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 5 · ROUND RESULTS — ALL WRONG (0 correct)
// ══════════════════════════════════════════════════════════════════════════

test.describe('Round Results — All Wrong', () => {
  test.beforeEach(({ page }) => goToRoundResults(page));

  test('heading shows player name', async ({ page }) => {
    await expect(page.locator('h1#results-heading')).toContainText('Tester');
  });

  test('correct count shows 0', async ({ page }) => {
    await expect(page.locator('.stat-item--correct dd')).toHaveText('0');
  });

  test('wrong count shows 5', async ({ page }) => {
    await expect(page.locator('.stat-item--wrong dd')).toHaveText('5');
  });

  test('accuracy shows 0%', async ({ page }) => {
    await expect(page.locator('.stat-item--pct dd')).toHaveText('0%');
  });

  test('verdict text reflects a low score', async ({ page }) => {
    await expect(page.locator('.results-verdict')).toContainText('Yikes');
  });

  test('round score row shows "+0 pts"', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(0)).toHaveText('+0 pts');
  });

  test('session total row shows "0 pts"', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(1)).toHaveText('0 pts');
  });

  test('all-time best = historicalTotal + session (100 + 0 = 100 pts)', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(2)).toHaveText('100 pts');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6 · ROUND RESULTS — ALL CORRECT (5 correct)
// ══════════════════════════════════════════════════════════════════════════

test.describe('Round Results — All Correct', () => {
  test.beforeEach(({ page }) => goToRoundResultsAllCorrect(page));

  test('correct count shows 5', async ({ page }) => {
    await expect(page.locator('.stat-item--correct dd')).toHaveText('5');
  });

  test('wrong count shows 0', async ({ page }) => {
    await expect(page.locator('.stat-item--wrong dd')).toHaveText('0');
  });

  test('accuracy shows 100%', async ({ page }) => {
    await expect(page.locator('.stat-item--pct dd')).toHaveText('100%');
  });

  test('verdict text says "Flawless victory" for a perfect score', async ({ page }) => {
    await expect(page.locator('.results-verdict')).toContainText('Flawless victory');
  });

  test('round score row shows "+50 pts"', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(0)).toHaveText('+50 pts');
  });

  test('session total row shows "50 pts"', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(1)).toHaveText('50 pts');
  });

  test('all-time best = historicalTotal + session (100 + 50 = 150 pts)', async ({ page }) => {
    await expect(page.locator('.score-row .score-value').nth(2)).toHaveText('150 pts');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 7 · CONTINUE TO NEXT ROUND
// ══════════════════════════════════════════════════════════════════════════

test.describe('Continue to Next Round', () => {
  test('"Another Round!" returns to playing phase at question 1', async ({ page }) => {
    await goToRoundResults(page);
    await page.click('button[aria-label="Play another round of 5 questions"]');
    await page.waitForSelector('.question-card');
    await expect(page.locator('.progress-label')).toHaveText('Question 1 / 5');
  });

  test('"Another Round!" sends seen question IDs in the exclude param', async ({ page }) => {
    await goToRoundResults(page);
    // Capture the next questions request (the first was consumed during initial load)
    const [questionsRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/questions/random')),
      page.click('button[aria-label="Play another round of 5 questions"]'),
    ]);
    const url = new URL(questionsRequest.url());
    const exclude = url.searchParams.get('exclude') ?? '';
    expect(exclude).toContain('q1');
    expect(exclude).toContain('q5');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 8 · QUIT FLOW
// ══════════════════════════════════════════════════════════════════════════

test.describe('Quit Flow', () => {
  test('"Save & Quit" sends POST request to /api/sessions', async ({ page }) => {
    await goToRoundResults(page);
    const [sessionRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/sessions') && req.method() === 'POST'),
      page.click('button[aria-label="Save score and quit"]'),
    ]);
    expect(sessionRequest.method()).toBe('POST');
  });

  test('"Save & Quit" sends score update for the correct user', async ({ page }) => {
    await goToRoundResults(page);
    const [scoreRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/score')),
      page.click('button[aria-label="Save score and quit"]'),
    ]);
    expect(scoreRequest.url()).toContain('user123');
  });

  test('"Save & Quit" returns to the name-entry screen', async ({ page }) => {
    await goToRoundResults(page);
    await page.click('button[aria-label="Save score and quit"]');
    await page.waitForSelector('.name-entry-card');
    await expect(page.locator('.name-entry-card')).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 9 · RETURNING USER — EXCLUDE IDS
// ══════════════════════════════════════════════════════════════════════════

test.describe('Returning User', () => {
  test('previously-answered question IDs sent as exclude in questions request', async ({ page }) => {
    const [questionsRequest] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/questions/random')),
      goToPlaying(page, { questionsAnswered: ['prev1', 'prev2'] }),
    ]);
    const url = new URL(questionsRequest.url());
    const exclude = url.searchParams.get('exclude') ?? '';
    expect(exclude).toContain('prev1');
    expect(exclude).toContain('prev2');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 10 · LEADERBOARD — CONTENT
// ══════════════════════════════════════════════════════════════════════════

test.describe('Leaderboard — Content', () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIRoutes(page);
    await page.goto('/');
    await page.click('button.leaderboard-btn');
    await page.waitForSelector('ol.leaderboard-list');
  });

  test('all 4 entries are displayed', async ({ page }) => {
    await expect(page.locator('ol.leaderboard-list li')).toHaveCount(4);
  });

  test('top-ranked entry shows correct player name', async ({ page }) => {
    await expect(page.locator('.leaderboard-name').first()).toHaveText('Alice');
  });

  test('top-ranked entry shows correct score', async ({ page }) => {
    await expect(page.locator('.leaderboard-score').first()).toContainText('500');
  });

  test('entries are displayed in rank order', async ({ page }) => {
    const names = page.locator('.leaderboard-name');
    await expect(names.nth(0)).toHaveText('Alice');
    await expect(names.nth(1)).toHaveText('Bob');
    await expect(names.nth(2)).toHaveText('Carol');
    await expect(names.nth(3)).toHaveText('Dave');
  });

  test('closing leaderboard hides the modal', async ({ page }) => {
    await page.click('button[aria-label="Close leaderboard"]');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('closing leaderboard restores the name-entry card', async ({ page }) => {
    await page.click('button[aria-label="Close leaderboard"]');
    await expect(page.locator('.name-entry-card')).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 11 · API ERROR RECOVERY
// ══════════════════════════════════════════════════════════════════════════

test.describe('API Error Recovery', () => {
  test('login failure shows descriptive error text', async ({ page }) => {
    await page.route('**/api/users/login', async route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-banner');
    await expect(page.locator('.error-banner')).toContainText('Cannot connect to the server');
  });

  test('dismissing error banner restores name-entry form', async ({ page }) => {
    await page.route('**/api/users/login', async route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-banner');
    await page.click('button[aria-label="Dismiss error"]');
    await expect(page.locator('.error-banner')).not.toBeVisible();
    await expect(page.locator('.name-entry-card')).toBeVisible();
  });

  test('questions API failure shows error message and stays at name-entry', async ({ page }) => {
    await page.route('**/api/users/login', async route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER, isNew: false }),
      })
    );
    await page.route('**/api/questions/random**', async route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-banner');
    await expect(page.locator('.error-banner')).toContainText('Failed to load questions');
    await expect(page.locator('.name-entry-card')).toBeVisible();
  });
});
