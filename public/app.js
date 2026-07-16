const elements = {
  answerContent: document.querySelector("#answerContent"),
  answerNumber: document.querySelector("#answerNumber"),
  answerText: document.querySelector("#answerText"),
  book: document.querySelector("#book"),
  closeButton: document.querySelector("#closeButton"),
  coverButton: document.querySelector("#coverButton"),
  errorToast: document.querySelector("#errorToast"),
  loadingScreen: document.querySelector("#loadingScreen"),
  modeCancel: document.querySelector("#modeCancel"),
  modePicker: document.querySelector("#modePicker"),
  openActions: document.querySelector("#openActions"),
  openBook: document.querySelector("#openBook"),
  pageNumber: document.querySelector("#pageNumber"),
  questionCopy: document.querySelector("#questionCopy"),
  randomMode: document.querySelector("#randomMode"),
  againButton: document.querySelector("#againButton"),
  soundButton: document.querySelector("#soundButton"),
  soundLabel: document.querySelector("#soundLabel"),
  statusText: document.querySelector("#statusText"),
  swipeMode: document.querySelector("#swipeMode"),
  turningPageNumber: document.querySelector("#turningPageNumber"),
  turningSheet: document.querySelector("#turningSheet"),
  turnSurface: document.querySelector("#turnSurface")
};

const state = {
  answers: [],
  audioContext: null,
  currentIndex: 0,
  lastRandomIndex: -1,
  mode: null,
  modePickerOpen: false,
  pointerId: null,
  pointerStartX: 0,
  pointerLastX: 0,
  pointerLastTime: 0,
  pointerVelocity: 0,
  dragRemainder: 0,
  inertiaFrame: null,
  isOpen: false,
  soundEnabled: true,
  turnAnimationTimer: null
};

function randomIndex() {
  if (state.answers.length < 2) return 0;

  const values = new Uint32Array(1);
  let next = state.lastRandomIndex;
  while (next === state.lastRandomIndex) {
    crypto.getRandomValues(values);
    next = values[0] % state.answers.length;
  }

  state.lastRandomIndex = next;
  return next;
}

function pageLabel(answer) {
  return String(answer.page || answer.id).padStart(3, "0");
}

function showAnswer(index, { animate = true, direction = 1 } = {}) {
  const length = state.answers.length;
  state.currentIndex = ((index % length) + length) % length;
  const answer = state.answers[state.currentIndex];
  const label = pageLabel(answer);

  elements.answerText.textContent = answer.text;
  elements.answerNumber.textContent = `ANSWER · ${label}`;
  elements.pageNumber.textContent = label;
  elements.turningPageNumber.textContent = label;

  if (animate) {
    elements.answerContent.classList.remove("answer-change");
    void elements.answerContent.offsetWidth;
    elements.answerContent.classList.add("answer-change");
    animatePageTurn(direction);
  }
}

function animatePageTurn(direction) {
  clearTimeout(state.turnAnimationTimer);
  const className = direction >= 0 ? "is-turning" : "is-turning-back";
  elements.turningSheet.classList.remove("is-turning", "is-turning-back");
  void elements.turningSheet.offsetWidth;
  elements.turningSheet.classList.add(className);
  state.turnAnimationTimer = setTimeout(() => {
    elements.turningSheet.classList.remove(className);
  }, 230);
  playPageSound();
}

function showModePicker() {
  if (state.isOpen || state.modePickerOpen) return;
  state.modePickerOpen = true;
  elements.modePicker.hidden = false;
  requestAnimationFrame(() => elements.modePicker.classList.add("is-visible"));
  elements.statusText.textContent = "选择一种与你的问题相遇的方式";
  playTapSound();
}

function hideModePicker() {
  state.modePickerOpen = false;
  elements.modePicker.classList.remove("is-visible");
  setTimeout(() => {
    if (!state.modePickerOpen) elements.modePicker.hidden = true;
  }, 260);
  if (!state.isOpen) {
    elements.statusText.textContent = "先想好一个问题，再触碰书封";
  }
}

function openBook(mode) {
  state.mode = mode;
  state.isOpen = true;
  hideModePicker();
  cancelInertia();

  const startingIndex = mode === "random" ? randomIndex() : randomIndex();
  showAnswer(startingIndex, { animate: false });

  elements.book.dataset.state = "opening";
  elements.openBook.setAttribute("aria-hidden", "false");
  elements.openActions.hidden = false;
  elements.openActions.style.display = "flex";
  elements.statusText.hidden = true;

  if (mode === "random") {
    elements.questionCopy.textContent = "你问过的问题，已经被这一页听见";
    elements.turnSurface.style.cursor = "default";
    elements.statusText.textContent = "轻触“再问一次”，可以重新抽取答案";
  } else {
    elements.questionCopy.textContent = "向左或向右滑动书页，松手后让它停下";
    elements.turnSurface.style.cursor = "grab";
    elements.statusText.textContent = "左右滑动右侧书页，速度越快，翻得越远";
  }

  playOpenSound();
  setTimeout(() => {
    if (state.isOpen) elements.book.dataset.state = "open";
  }, 900);
}

function closeBook() {
  state.isOpen = false;
  state.mode = null;
  state.pointerId = null;
  cancelInertia();
  elements.book.dataset.state = "closed";
  elements.openBook.setAttribute("aria-hidden", "true");
  elements.openActions.hidden = true;
  elements.openActions.style.display = "";
  elements.statusText.hidden = false;
  elements.statusText.textContent = "先想好一个问题，再触碰书封";
  playCloseSound();
}

function turnPages(count) {
  if (!count) return;
  const direction = Math.sign(count);
  showAnswer(state.currentIndex + count, { direction });
  vibrate(Math.abs(count) > 4 ? 8 : 4);
}

function onPointerDown(event) {
  if (!state.isOpen || state.mode !== "swipe" || state.pointerId !== null) return;
  cancelInertia();
  state.pointerId = event.pointerId;
  state.pointerStartX = event.clientX;
  state.pointerLastX = event.clientX;
  state.pointerLastTime = performance.now();
  state.pointerVelocity = 0;
  state.dragRemainder = 0;
  elements.turnSurface.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (event.pointerId !== state.pointerId) return;

  const now = performance.now();
  const deltaX = event.clientX - state.pointerLastX;
  const deltaTime = Math.max(8, now - state.pointerLastTime);
  state.pointerVelocity = state.pointerVelocity * 0.55 + (deltaX / deltaTime) * 0.45;
  state.dragRemainder += deltaX;

  const threshold = 13;
  const pageDelta = Math.trunc(state.dragRemainder / threshold);
  if (pageDelta !== 0) {
    turnPages(-pageDelta);
    state.dragRemainder -= pageDelta * threshold;
  }

  const bend = Math.max(-10, Math.min(10, deltaX * -0.35));
  elements.turnSurface.style.transform = `rotateY(${bend}deg)`;
  state.pointerLastX = event.clientX;
  state.pointerLastTime = now;
}

function onPointerEnd(event) {
  if (event.pointerId !== state.pointerId) return;
  state.pointerId = null;
  elements.turnSurface.style.transform = "";

  const velocity = -state.pointerVelocity;
  if (Math.abs(velocity) > 0.09) {
    startInertia(velocity);
  } else {
    playSettleSound();
  }
}

function startInertia(initialVelocity) {
  cancelInertia();
  let velocity = Math.max(-2.4, Math.min(2.4, initialVelocity));
  let accumulator = 0;
  let previousTime = performance.now();

  const tick = (now) => {
    const elapsed = Math.min(34, now - previousTime);
    previousTime = now;
    accumulator += velocity * elapsed * 0.12;

    const wholePages = Math.trunc(accumulator);
    if (wholePages !== 0) {
      turnPages(wholePages);
      accumulator -= wholePages;
    }

    velocity *= Math.pow(0.92, elapsed / 16.67);
    if (Math.abs(velocity) > 0.045) {
      state.inertiaFrame = requestAnimationFrame(tick);
    } else {
      state.inertiaFrame = null;
      playSettleSound();
    }
  };

  state.inertiaFrame = requestAnimationFrame(tick);
}

function cancelInertia() {
  if (state.inertiaFrame) {
    cancelAnimationFrame(state.inertiaFrame);
    state.inertiaFrame = null;
  }
}

function ensureAudio() {
  if (!state.soundEnabled) return null;
  if (!state.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    state.audioContext = new AudioContext();
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }
  return state.audioContext;
}

function playTone({ frequency = 220, duration = 0.08, gain = 0.025, type = "sine", delay = 0 }) {
  const context = ensureAudio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playTapSound() {
  playTone({ frequency: 310, duration: 0.07, gain: 0.018 });
}

function playOpenSound() {
  playTone({ frequency: 155, duration: 0.32, gain: 0.025, type: "triangle" });
  playTone({ frequency: 235, duration: 0.28, gain: 0.015, type: "sine", delay: 0.08 });
}

function playCloseSound() {
  playTone({ frequency: 180, duration: 0.16, gain: 0.025, type: "triangle" });
}

let lastPageSound = 0;
function playPageSound() {
  const now = performance.now();
  if (now - lastPageSound < 45) return;
  lastPageSound = now;
  playTone({
    frequency: 520 + Math.random() * 90,
    duration: 0.035,
    gain: 0.007,
    type: "triangle"
  });
}

function playSettleSound() {
  playTone({ frequency: 270, duration: 0.08, gain: 0.013, type: "sine" });
}

function vibrate(duration) {
  if ("vibrate" in navigator) navigator.vibrate(duration);
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundLabel.textContent = state.soundEnabled ? "声音开" : "声音关";
  if (state.soundEnabled) playTapSound();
}

function showError(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.hidden = false;
}

async function init() {
  try {
    const response = await fetch("/data/aqi-answer-book.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`答案数据加载失败（${response.status}）`);
    const answerBook = await response.json();
    if (!Array.isArray(answerBook.answers) || answerBook.answers.length === 0) {
      throw new Error("答案数据为空");
    }
    state.answers = answerBook.answers;

    elements.coverButton.addEventListener("click", showModePicker);
    elements.modeCancel.addEventListener("click", hideModePicker);
    elements.randomMode.addEventListener("click", () => openBook("random"));
    elements.swipeMode.addEventListener("click", () => openBook("swipe"));
    elements.closeButton.addEventListener("click", closeBook);
    elements.soundButton.addEventListener("click", toggleSound);
    elements.againButton.addEventListener("click", () => {
      cancelInertia();
      if (state.mode === "random") {
        showAnswer(randomIndex());
      } else {
        turnPages(Math.random() < 0.5 ? -1 : 1);
      }
    });

    elements.turnSurface.addEventListener("pointerdown", onPointerDown);
    elements.turnSurface.addEventListener("pointermove", onPointerMove);
    elements.turnSurface.addEventListener("pointerup", onPointerEnd);
    elements.turnSurface.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.modePickerOpen) hideModePicker();
        else if (state.isOpen) closeBook();
      }
      if (state.isOpen && state.mode === "swipe") {
        if (event.key === "ArrowLeft") turnPages(-1);
        if (event.key === "ArrowRight") turnPages(1);
      }
    });

    setTimeout(() => elements.loadingScreen.classList.add("is-hidden"), 420);
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : "答案之书暂时无法打开");
    elements.loadingScreen.classList.add("is-hidden");
  }
}

init();
