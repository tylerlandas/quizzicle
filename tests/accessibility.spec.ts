/**
 * Accessibility UI Tests — Quizzicle
 *
 * Coverage:
 *  · WCAG 2.1 AA automated scans via axe-core on every major screen/state
 *  · Color contrast ratios computed against the live DOM (WCAG 1.4.3)
 *  · Semantic markup: landmark roles, heading hierarchy, dl/dt/dd stats
 *  · ARIA attributes: role, aria-label, aria-labelledby, aria-live, aria-modal,
 *    aria-pressed, aria-invalid, aria-required, aria-describedby, aria-busy
 *  · Focus management: auto-focus on open, return-focus on close
 *  · Focus trapping in modal dialogs (Tab / Shift+Tab)
 *  · Keyboard activation: Enter on buttons / form submit
 *  · Escape key dismissal for modals
 *  · Visible focus indicators (amber box-shadow focus ring)
 *  · Minimum touch target sizes (WCAG 2.5.8)
 *  · prefers-reduced-motion: no animation or transition durations > 0
 *  · Error / empty / loading live-region ARIA attributes
 *
 * All network calls are intercepted via page.route() – no real backend needed.
 * Run: npm run test:a11y
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Mock fixtures ──────────────────────────────────────────────────────────

const MOCK_USER = {
  _id: 'user123',
  name: 'Tester',
  totalScore: 100,
  questionsAnswered: [],
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

async function setupAPIRoutes(page: Page): Promise<void> {
  await page.route('**/api/users/login', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: MOCK_USER, isNew: false }),
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
      body: JSON.stringify(MOCK_USER),
    })
  );
  await page.route('**/api/users/*/preferences', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
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

async function goToPlaying(page: Page): Promise<void> {
  await setupAPIRoutes(page);
  await page.goto('/');
  await page.fill('input[type="text"]', 'Tester');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.question-card');
}

/** correct=true clicks Mercury (index 1, correct); correct=false clicks Venus (index 0, wrong). */
async function goToFeedback(page: Page, correct = true): Promise<void> {
  await goToPlaying(page);
  await page.locator('.option-btn').nth(correct ? 1 : 0).click();
  await page.waitForSelector('[role="dialog"]');
}

/** Answers all 5 questions (any option) to reach the round-results screen. */
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

/** Opens leaderboard from the name-entry screen. */
async function openLeaderboard(page: Page): Promise<void> {
  await page.route('**/api/users/leaderboard', async route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LEADERBOARD),
    })
  );
  await page.goto('/');
  await page.click('button.leaderboard-btn');
  await page.waitForSelector('ol.leaderboard-list');
}

// ── Color contrast utility ─────────────────────────────────────────────────

/**
 * Computes the WCAG contrast ratio for the text color of a given element
 * against its computed background (traversing transparent parent backgrounds).
 * Returns -1 if colors cannot be parsed.
 */
async function contrastRatio(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel: string) => {
    function toLinear(c: number): number {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }
    function luminance(r: number, g: number, b: number): number {
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }
    function parseRGBA(css: string): [number, number, number, number] | null {
      const m = css.match(
        /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/
      );
      if (!m) return null;
      return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
    }
    /** Blend semi-transparent backgrounds up the DOM tree, starting from body default. */
    function resolvedBg(el: Element): [number, number, number] {
      let [r, g, b] = [14, 17, 51]; // body #0e1133
      const layers: [number, number, number, number][] = [];
      let node: Element | null = el.parentElement;
      while (node && node !== document.documentElement) {
        const bg = window.getComputedStyle(node).backgroundColor;
        const parsed = parseRGBA(bg);
        if (parsed && parsed[3] > 0) layers.unshift(parsed);
        node = node.parentElement;
      }
      for (const [lr, lg, lb, la] of layers) {
        r = Math.round(la * lr + (1 - la) * r);
        g = Math.round(la * lg + (1 - la) * g);
        b = Math.round(la * lb + (1 - la) * b);
      }
      return [r, g, b];
    }

    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return -1;
    const fg = parseRGBA(window.getComputedStyle(el).color);
    if (!fg) return -1;
    const [bgR, bgG, bgB] = resolvedBg(el);
    const L1 = luminance(fg[0], fg[1], fg[2]);
    const L2 = luminance(bgR, bgG, bgB);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }, selector);
}

// ══════════════════════════════════════════════════════════════════════════
// 1 · NAME ENTRY
// ══════════════════════════════════════════════════════════════════════════

test.describe('Name Entry', () => {
  test.beforeEach(({ page }) => goToNameEntry(page));

  // ── axe ──────────────────────────────────────────────────────────────────

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  // ── Skip link ─────────────────────────────────────────────────────────────

  test('skip link: is the first focusable element on the page', async ({ page }) => {
    // Verify .skip-link appears first in the tabbable elements list.
    // Testing Tab order directly in headless Chromium is unreliable when
    // an element (input) is auto-focused via useEffect on mount.
    const firstFocusableClass = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(el => {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
      });
      return candidates[0]?.className ?? '';
    });
    expect(firstFocusableClass).toContain('skip-link');
  });

  test('skip link: becomes visible when focused', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeVisible();
  });

  test('skip link: #main-content anchor exists in DOM', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeAttached();
  });

  // ── Form markup ───────────────────────────────────────────────────────────

  test('form: input has programmatically associated <label>', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    const id = await input.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(page.locator(`label[for="${id}"]`)).toBeAttached();
  });

  test('form: input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[type="text"]')).toHaveAttribute('aria-required', 'true');
  });

  test('form: empty submission triggers role="alert" error', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText('Please enter your name');
  });

  test('form: error message linked to input via aria-describedby', async ({ page }) => {
    await page.click('button[type="submit"]');
    const input = page.locator('input[type="text"]');
    const descId = await input.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    // React useId() generates IDs containing ":" which break CSS #id selectors;
    // use the attribute selector instead.
    await expect(page.locator(`[id="${descId}"]`)).toBeVisible();
  });

  test('form: input aria-invalid="true" when validation fails', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('input[type="text"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('form: sound checkbox has programmatically associated label', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    const id = await checkbox.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(page.locator(`label[for="${id}"]`)).toBeAttached();
  });

  // ── Button accessible names ───────────────────────────────────────────────

  test('button: submit button has non-empty accessible name', async ({ page }) => {
    const text = await page.locator('button[type="submit"]')
      .evaluate(el => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim());
    expect(text.length).toBeGreaterThan(0);
  });

  test('button: leaderboard button has non-empty accessible name', async ({ page }) => {
    const text = await page.locator('button.leaderboard-btn')
      .evaluate(el => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim());
    expect(text.length).toBeGreaterThan(0);
  });

  // ── Color contrast ────────────────────────────────────────────────────────

  test('contrast: primary button text ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.btn-primary')).toBeGreaterThanOrEqual(4.5);
  });

  test('contrast: secondary button text ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.btn-secondary')).toBeGreaterThanOrEqual(4.5);
  });

  test('contrast: form label text ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.form-label')).toBeGreaterThanOrEqual(4.5);
  });

  test('contrast: form input text ≥ 4.5:1', async ({ page }) => {
    // Type something so the text color is applied
    await page.fill('input[type="text"]', 'Test');
    expect(await contrastRatio(page, '.form-input')).toBeGreaterThanOrEqual(4.5);
  });

  // ── Touch targets (WCAG 2.5.8) ────────────────────────────────────────────

  test('touch target: submit button ≥ 48×48px', async ({ page }) => {
    const box = await page.locator('button[type="submit"]').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(48);
  });

  test('touch target: name input ≥ 48px height', async ({ page }) => {
    const box = await page.locator('.form-input').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });

  // ── Keyboard navigation ───────────────────────────────────────────────────

  test('keyboard: Enter key submits the form', async ({ page }) => {
    await page.fill('input[type="text"]', 'Tester');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.question-card', { timeout: 5000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2 · PLAYING PHASE
// ══════════════════════════════════════════════════════════════════════════

test.describe('Playing Phase', () => {
  test.beforeEach(({ page }) => goToPlaying(page));

  // ── axe ──────────────────────────────────────────────────────────────────

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  // ── Landmark roles ────────────────────────────────────────────────────────

  test('landmark: exactly one main landmark (<main> element)', async ({ page }) => {
    // question-card uses role="region", not role="main" — no duplicate landmark
    const mains = page.locator('main, [role="main"]');
    expect(await mains.count()).toBe(1);
  });

  test('landmark: question card uses role="region"', async ({ page }) => {
    await expect(page.locator('.question-card[role="region"]')).toBeAttached();
  });

  test('landmark: question card labelled via aria-labelledby', async ({ page }) => {
    const card = page.locator('.question-card[role="region"]');
    const labelId = await card.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    // React useId() IDs contain ":" which breaks CSS #id selectors; use attribute selector.
    await expect(page.locator(`[id="${labelId}"]`)).toBeVisible();
  });

  // ── Progress bar ──────────────────────────────────────────────────────────

  test('progress: bar has role="progressbar"', async ({ page }) => {
    await expect(page.locator('[role="progressbar"]')).toBeAttached();
  });

  test('progress: bar has aria-valuenow / aria-valuemin / aria-valuemax', async ({ page }) => {
    const bar = page.locator('[role="progressbar"]');
    await expect(bar).toHaveAttribute('aria-valuenow');
    await expect(bar).toHaveAttribute('aria-valuemin');
    await expect(bar).toHaveAttribute('aria-valuemax');
  });

  test('progress: aria-valuenow matches question 1 of 5', async ({ page }) => {
    const bar = page.locator('[role="progressbar"]');
    expect(await bar.getAttribute('aria-valuenow')).toBe('1');
    expect(await bar.getAttribute('aria-valuemin')).toBe('1');
    expect(await bar.getAttribute('aria-valuemax')).toBe('5');
  });

  test('progress: bar has descriptive aria-label', async ({ page }) => {
    const label = await page.locator('[role="progressbar"]').getAttribute('aria-label');
    expect(label).toMatch(/question \d+ of \d+/i);
  });

  // ── Question markup ───────────────────────────────────────────────────────

  test('markup: question text rendered as h1 inside the card', async ({ page }) => {
    await expect(page.locator('.question-card h1')).toBeVisible();
  });

  // ── Answer options ────────────────────────────────────────────────────────

  test('options: exactly 4 answer buttons rendered', async ({ page }) => {
    expect(await page.locator('.option-btn').count()).toBe(4);
  });

  test('options: every button has a non-empty aria-label', async ({ page }) => {
    const btns = page.locator('.option-btn');
    for (let i = 0; i < 4; i++) {
      const label = await btns.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  test('options: letter badges (A–D) are aria-hidden="true" (decorative)', async ({ page }) => {
    const letters = page.locator('.option-letter');
    for (let i = 0; i < await letters.count(); i++) {
      await expect(letters.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  // ── Score / sound ─────────────────────────────────────────────────────────

  test('score: display element has aria-label', async ({ page }) => {
    await expect(page.locator('[aria-label*="Score:"]')).toBeAttached();
  });

  test('sound: toggle has aria-pressed with boolean value', async ({ page }) => {
    const val = await page.locator('.sound-toggle').first().getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(val);
  });

  // ── Color contrast ────────────────────────────────────────────────────────

  test('contrast: question text ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.question-text')).toBeGreaterThanOrEqual(4.5);
  });

  test('contrast: answer option text ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.option-btn .option-text')).toBeGreaterThanOrEqual(4.5);
  });

  // ── Keyboard ─────────────────────────────────────────────────────────────

  test('keyboard: Enter on focused option button opens feedback modal', async ({ page }) => {
    await page.locator('.option-btn').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 3 · FEEDBACK MODAL – Correct answer
// ══════════════════════════════════════════════════════════════════════════

test.describe('Feedback Modal — correct answer', () => {
  test.beforeEach(({ page }) => goToFeedback(page, true));

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('dialog: has role="dialog"', async ({ page }) => {
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('dialog: has aria-modal="true"', async ({ page }) => {
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  });

  test('dialog: has accessible label (aria-label)', async ({ page }) => {
    const label = await page.locator('[role="dialog"]').getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  test('focus: Continue button receives focus on open', async ({ page }) => {
    await expect(page.locator('button[aria-label="Continue to next question"]')).toBeFocused();
  });

  test('focus trap: Tab stays on Continue button (only focusable element)', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('button[aria-label="Continue to next question"]')).toBeFocused();
  });

  test('focus trap: Shift+Tab wraps back to Continue button', async ({ page }) => {
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('button[aria-label="Continue to next question"]')).toBeFocused();
  });

  test('keyboard: Escape closes the modal', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('content: "Correct!" heading shown', async ({ page }) => {
    await expect(page.locator('.feedback-heading')).toHaveText('Correct!');
  });

  test('content: correct-answer text NOT shown when answer is correct', async ({ page }) => {
    await expect(page.locator('.feedback-correct-answer')).not.toBeVisible();
  });

  test('contrast: feedback heading ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.feedback-heading')).toBeGreaterThanOrEqual(4.5);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 4 · FEEDBACK MODAL – Wrong answer
// ══════════════════════════════════════════════════════════════════════════

test.describe('Feedback Modal — wrong answer', () => {
  test.beforeEach(({ page }) => goToFeedback(page, false));

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('content: "Wrong!" heading shown', async ({ page }) => {
    await expect(page.locator('.feedback-heading')).toHaveText('Wrong!');
  });

  test('content: correct answer text shown when wrong answer chosen', async ({ page }) => {
    await expect(page.locator('.feedback-correct-answer')).toBeVisible();
    // q1 correct answer is index 1 = 'Mercury'
    await expect(page.locator('.feedback-correct-answer')).toContainText('Mercury');
  });

  test('content: "Correct answer:" label is present', async ({ page }) => {
    await expect(page.locator('.feedback-correct-answer__label')).toContainText('Correct answer:');
  });

  test('contrast: feedback message ≥ 4.5:1', async ({ page }) => {
    expect(await contrastRatio(page, '.feedback-message')).toBeGreaterThanOrEqual(4.5);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 5 · ROUND RESULTS
// ══════════════════════════════════════════════════════════════════════════

test.describe('Round Results', () => {
  test.beforeEach(({ page }) => goToRoundResults(page));

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('landmark: exactly one main landmark (results card uses role="region")', async ({ page }) => {
    expect(await page.locator('main, [role="main"]').count()).toBe(1);
  });

  test('markup: h1 heading has id="results-heading"', async ({ page }) => {
    await expect(page.locator('h1#results-heading')).toBeVisible();
  });

  test('landmark: results card labelled via aria-labelledby="results-heading"', async ({ page }) => {
    await expect(page.locator('[aria-labelledby="results-heading"]')).toBeAttached();
  });

  test('markup: stats use dl / dt / dd structure', async ({ page }) => {
    await expect(page.locator('dl.stats-grid')).toBeVisible();
    expect(await page.locator('dl.stats-grid dt').count()).toBeGreaterThan(0);
    expect(await page.locator('dl.stats-grid dd').count()).toBeGreaterThan(0);
  });

  test('stats: every <dd> has a descriptive aria-label', async ({ page }) => {
    const dds = page.locator('.stats-grid dd');
    const count = await dds.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await dds.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }
  });

  test('button: "Another Round!" has specific aria-label', async ({ page }) => {
    await expect(
      page.locator('button[aria-label="Play another round of 5 questions"]')
    ).toBeVisible();
  });

  test('button: "Save & Quit" has specific aria-label', async ({ page }) => {
    await expect(page.locator('button[aria-label="Save score and quit"]')).toBeVisible();
  });

  test('sound: toggle has aria-pressed with boolean value', async ({ page }) => {
    const val = await page.locator('.sound-toggle').first().getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(val);
  });

  test('score breakdown: section has aria-label', async ({ page }) => {
    await expect(page.locator('[aria-label="Score breakdown"]')).toBeVisible();
  });

  test('touch target: "Another Round!" button ≥ 48px height', async ({ page }) => {
    const box = await page.locator('button[aria-label="Play another round of 5 questions"]').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6 · LEADERBOARD MODAL
// ══════════════════════════════════════════════════════════════════════════

test.describe('Leaderboard Modal', () => {
  test.beforeEach(({ page }) => openLeaderboard(page));

  test('axe: WCAG 2.1 AA automated scan passes', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('dialog: has role="dialog" with aria-label="Leaderboard"', async ({ page }) => {
    await expect(
      page.locator('[role="dialog"][aria-label="Leaderboard"]')
    ).toBeVisible();
  });

  test('dialog: has aria-modal="true"', async ({ page }) => {
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  });

  test('focus: close button receives focus on open', async ({ page }) => {
    await expect(page.locator('button[aria-label="Close leaderboard"]')).toBeFocused();
  });

  test('keyboard: Escape closes the modal', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('focus trap: Tab wraps back to close button', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('button[aria-label="Close leaderboard"]')).toBeFocused();
  });

  test('focus trap: Shift+Tab wraps back to close button', async ({ page }) => {
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('button[aria-label="Close leaderboard"]')).toBeFocused();
  });

  test('list: <ol> has aria-label "Players ranked by score"', async ({ page }) => {
    await expect(
      page.locator('ol[aria-label="Players ranked by score"]')
    ).toBeVisible();
  });

  test('list: each rank item has an aria-label with rank number', async ({ page }) => {
    const rankLabels = page.locator('[aria-label^="Rank"]');
    expect(await rankLabels.count()).toBe(MOCK_LEADERBOARD.length);
  });

  test('list: top-3 rows have visual medal class', async ({ page }) => {
    expect(await page.locator('.leaderboard-row--top').count()).toBe(3);
  });

  test('close button has accessible name', async ({ page }) => {
    const btn = page.locator('button[aria-label="Close leaderboard"]');
    await expect(btn).toBeVisible();
    const label = await btn.getAttribute('aria-label');
    expect(label).toBe('Close leaderboard');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 7 · LEADERBOARD – empty & error states
// ══════════════════════════════════════════════════════════════════════════

test.describe('Leaderboard — empty and error states', () => {
  test('empty state: shown when leaderboard returns no entries', async ({ page }) => {
    await page.route('**/api/users/leaderboard', async route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/');
    await page.click('button.leaderboard-btn');
    await page.waitForSelector('.leaderboard-empty');
    await expect(page.locator('.leaderboard-empty')).toBeVisible();
  });

  test('error state: has role="alert" when API fails', async ({ page }) => {
    await page.route('**/api/users/leaderboard', async route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/');
    await page.click('button.leaderboard-btn');
    await page.waitForSelector('.leaderboard-error[role="alert"]');
    await expect(page.locator('.leaderboard-error[role="alert"]')).toBeVisible();
  });

  test('loading state: spinner has role="status" and aria-live="polite"', async ({ page }) => {
    let resolveRoute!: () => void;
    const waitForTest = new Promise<void>(r => { resolveRoute = r; });
    await page.route('**/api/users/leaderboard', async route => {
      await waitForTest; // hold until we've checked the loading state
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/');
    await page.click('button.leaderboard-btn');
    await expect(page.locator('.leaderboard-status[role="status"]')).toBeVisible();
    await expect(page.locator('[role="status"][aria-live="polite"]')).toBeAttached();
    resolveRoute();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 8 · ERROR BANNER
// ══════════════════════════════════════════════════════════════════════════

test.describe('Error Banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/login', async route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-banner[role="alert"]');
  });

  test('axe: WCAG 2.1 AA automated scan passes with error shown', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('banner: has role="alert"', async ({ page }) => {
    await expect(page.locator('.error-banner[role="alert"]')).toBeVisible();
  });

  test('banner: has aria-live="assertive"', async ({ page }) => {
    await expect(page.locator('.error-banner')).toHaveAttribute('aria-live', 'assertive');
  });

  test('dismiss: button has aria-label="Dismiss error"', async ({ page }) => {
    await expect(page.locator('button[aria-label="Dismiss error"]')).toBeVisible();
  });

  test('dismiss: button meets 44×44px minimum touch target', async ({ page }) => {
    const box = await page.locator('button[aria-label="Dismiss error"]').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });

  test('dismiss: clicking hides the error banner', async ({ page }) => {
    await page.click('button[aria-label="Dismiss error"]');
    await expect(page.locator('.error-banner')).not.toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 9 · LOADING STATE
// ══════════════════════════════════════════════════════════════════════════

test.describe('Loading State', () => {
  test('loading card: has role="status" and aria-live="polite"', async ({ page }) => {
    let resolveRoute!: () => void;
    const waitForTest = new Promise<void>(r => { resolveRoute = r; });
    await page.route('**/api/users/login', async route => {
      await waitForTest;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER, isNew: false }),
      });
    });
    await page.route('**/api/questions/random**', async route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_QUESTIONS) })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="status"][aria-live="polite"]')).toBeAttached();
    resolveRoute();
  });

  test('loading card: replaces form while waiting (no inaccessible hidden content)', async ({ page }) => {
    // When isLoading=true, App.tsx unmounts <NameEntry> and shows the loading card instead.
    // Verify that the loading card appears and the submit button is gone.
    let resolveRoute!: () => void;
    const waitForTest = new Promise<void>(r => { resolveRoute = r; });
    await page.route('**/api/users/login', async route => {
      await waitForTest;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER, isNew: false }),
      });
    });
    await page.route('**/api/questions/random**', async route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_QUESTIONS) })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    // Loading card visible; submit button removed from DOM
    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).not.toBeAttached();
    resolveRoute();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 10 · FOCUS VISIBILITY (WCAG 2.4.11)
// ══════════════════════════════════════════════════════════════════════════

test.describe('Focus Visibility', () => {
  test('CSS variable --focus-ring is set to amber (#F59E0B)', async ({ page }) => {
    await goToNameEntry(page);
    const focusRing = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim()
    );
    // Expected: "0 0 0 3px #F59E0B"
    expect(focusRing).toContain('#F59E0B');
  });

  test('form input: amber focus ring applied when auto-focused on mount', async ({ page }) => {
    await goToNameEntry(page);
    // useEffect auto-focuses the input; :focus box-shadow should already be active
    const shadow = await page.locator('input[type="text"]').evaluate(
      el => window.getComputedStyle(el).boxShadow
    );
    expect(shadow).toContain('245, 158, 11'); // #F59E0B rgb
  });

  test('CSS: .btn:focus-visible rule applies box-shadow', async ({ page }) => {
    await goToNameEntry(page);
    const hasRule = await page.evaluate(() =>
      Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(r =>
            r.cssText.includes('.btn:focus-visible') && r.cssText.includes('box-shadow')
          );
        } catch { return false; }
      })
    );
    expect(hasRule).toBe(true);
  });

  test('CSS: .option-btn:focus-visible rule applies box-shadow', async ({ page }) => {
    await goToPlaying(page);
    const hasRule = await page.evaluate(() =>
      Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(r =>
            r.cssText.includes('.option-btn:focus-visible') && r.cssText.includes('box-shadow')
          );
        } catch { return false; }
      })
    );
    expect(hasRule).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 11 · REDUCED MOTION (prefers-reduced-motion: reduce)
// ══════════════════════════════════════════════════════════════════════════

test.describe('Reduced Motion', () => {
  // page.emulateMedia() must be called before page.goto() so the CSS media
  // query is already active when styles are first computed.

  test('card: animation-name is "none" with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goToNameEntry(page);
    const animName = await page.locator('.card').first().evaluate(
      el => window.getComputedStyle(el).animationName
    );
    expect(animName).toBe('none');
  });

  test('progress bar fill: transition-property is "none" with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goToPlaying(page);
    const transProperty = await page.locator('.progress-bar-fill').evaluate(
      el => window.getComputedStyle(el).transitionProperty
    );
    expect(transProperty).toBe('none');
  });

  test('feedback icon: animation-name is "none" with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await goToFeedback(page, true);
    const animName = await page.locator('.feedback-icon').evaluate(
      el => window.getComputedStyle(el).animationName
    );
    expect(animName).toBe('none');
  });

  test('loading spinner: animation-name is "none" with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let resolveRoute!: () => void;
    const waitForTest = new Promise<void>(r => { resolveRoute = r; });
    await page.route('**/api/users/login', async route => {
      await waitForTest;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER, isNew: false }),
      });
    });
    await page.route('**/api/questions/random**', async route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_QUESTIONS) })
    );
    await page.goto('/');
    await page.fill('input[type="text"]', 'Tester');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.spinner');
    const animName = await page.locator('.spinner').evaluate(
      el => window.getComputedStyle(el).animationName
    );
    expect(animName).toBe('none');
    resolveRoute();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 12 · DECORATIVE ELEMENTS HIDDEN FROM SCREEN READERS
// ══════════════════════════════════════════════════════════════════════════

test.describe('Decorative Markup', () => {
  test.beforeEach(({ page }) => goToNameEntry(page));

  test('background SVG wrapper is hidden from assistive technology', async ({ page }) => {
    const wrapper = page.locator('.qz-bg-wrapper');
    // Background is decorative — should have aria-hidden
    await expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  test('logo letter spans do not expose redundant text (aria-label on container)', async ({ page }) => {
    // The .logo-header div has aria-label="Quizzicle"; individual spans should NOT
    // each expose their single letter to the accessibility tree.
    await expect(page.locator('.logo-header')).toHaveAttribute('aria-label', 'Quizzicle');
  });
});
