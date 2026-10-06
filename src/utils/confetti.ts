import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F472B6', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA'],
    });
  } catch (e) {
    console.debug('Confetti error', e);
  }
};

export const triggerMegaConfetti = () => {
  try {
    const end = Date.now() + 1000;
    const colors = ['#F472B6', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch (e) {
    console.debug('Mega confetti error', e);
  }
};
