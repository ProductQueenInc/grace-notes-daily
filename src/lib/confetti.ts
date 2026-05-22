import confetti from "canvas-confetti";

export function softGoldConfetti() {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6 },
    colors: ["#debe36", "#f0d970", "#fff4c2"],
    ticks: 90,
    scalar: 0.8,
    gravity: 0.7,
  });
}

export function generousAnsweredConfetti() {
  const end = Date.now() + 2800;
  const colors = ["#debe36", "#285c37", "#f0d970", "#5a9b6e"];
  (function frame() {
    confetti({ particleCount: 8, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 8, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function subtleConfetti() {
  confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 }, colors: ["#debe36", "#285c37"], scalar: 0.7 });
}
