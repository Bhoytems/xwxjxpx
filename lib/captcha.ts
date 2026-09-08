const EMOJI_POOL = ["🍌", "🥕", "🥖", "🌶️", "🍇", "🍉", "🍍", "🥔", "🌽", "🍒", "🥑", "🍋"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks a random target emoji plus 3 random decoys, all shuffled together.
export function generateCaptcha(): { target: string; options: string[] } {
  const shuffledPool = shuffle(EMOJI_POOL);
  const target = shuffledPool[0];
  const decoys = shuffledPool.slice(1, 4);
  const options = shuffle([target, ...decoys]);
  return { target, options };
}
