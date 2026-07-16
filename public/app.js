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
  sheetBackAnswer: document.querySelector("#sheetBackAnswer"),
  sheetBackNumber: document.querySelector("#sheetBackNumber"),
  sheetBackPage: document.querySelector("#sheetBackPage"),
  sheetBackText: document.querySelector("#sheetBackText"),
  sheetFrontAnswer: document.querySelector("#sheetFrontAnswer"),
  sheetFrontNumber: document.querySelector("#sheetFrontNumber"),
  sheetFrontPage: document.querySelector("#sheetFrontPage"),
  sheetFrontText: document.querySelector("#sheetFrontText"),
  turningSheet: document.querySelector("#turningSheet"),
  turnSurface: document.querySelector("#turnSurface")
};

const state = {
  answers: [],
  audioContext: null,
  currentIndex: 0,
  mode: null,
  modePickerOpen: false,
  pointerId: null,
  pointerStartX: 0,
  pointerLastX: 0,
  pointerLastTime: 0,
  pointerVelocity: 0,
  flipDirection: 0,
  flipProgress: 0,
  flipTargetIndex: 0,
  isAnimating: false,
  isOpen: false,
  soundEnabled: true
};

function randomIndex() {
  const answerCount = state.answers.length;
  if (answerCount <= 1) return 0;

  // Reject the small remainder above the largest evenly divisible range.
  // This gives every answer exactly the same probability and allows repeats.
  const uniformLimit =
    Math.floor(0x100000000 / answerCount) * answerCount;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= uniformLimit);

  return values[0] % answerCount;
}

function pageLabel(answer) {
  return String(answer.page || answer.id).padStart(3, "0");
}

function normalizedIndex(index) {
  const length = state.answers.length;
  return ((index % length) + length) % length;
}

function paintAnswer(answer, textNode, numberNode, pageNode) {
  const label = pageLabel(answer);

  textNode.textContent = answer.text;
  numberNode.textContent = `ANSWER · ${label}`;
  pageNode.textContent = label;
}

function paintMainAnswer(index) {
  paintAnswer(
    state.answers[normalizedIndex(index)],
    elements.answerText,
    elements.answerNumber,
    elements.pageNumber
  );
}

function paintSheetAnswer(index, side) {
  const answer = state.answers[normalizedIndex(index)];
  if (side === "front") {
    paintAnswer(
      answer,
      elements.sheetFrontText,
      elements.sheetFrontNumber,
      elements.sheetFrontPage
    );
    return;
  }
  paintAnswer(
    answer,
    elements.sheetBackText,
    elements.sheetBackNumber,
    elements.sheetBackPage
  );
}

function showAnswer(index, { animate = true } = {}) {
  state.currentIndex = normalizedIndex(index);
  paintMainAnswer(state.currentIndex);

  if (animate) {
    elements.answerContent.classList.remove("answer-change");
    void elements.answerContent.offsetWidth;
    elements.answerContent.classList.add("answer-change");
  }
}

function setFlipTransform(progress, duration = 0) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const angle = -180 * state.flipDirection * clampedProgress;
  const shadow = Math.sin(clampedProgress * Math.PI);
  elements.turningSheet.style.transition =
    duration > 0
      ? `transform ${duration}ms cubic-bezier(0.2, 0.78, 0.24, 1)`
      : "none";
  elements.turningSheet.style.setProperty("--flip-shadow", shadow.toFixed(3));
  elements.turningSheet.style.transform =
    `rotateY(${angle}deg) translateZ(2px)`;
  state.flipProgress = clampedProgress;
}

function prepareFlip(direction) {
  state.flipDirection = direction;
  state.flipTargetIndex = normalizedIndex(state.currentIndex + direction);
  elements.turningSheet.dataset.direction =
    direction > 0 ? "forward" : "backward";

  if (direction > 0) {
    paintSheetAnswer(state.currentIndex, "front");
    paintSheetAnswer(state.flipTargetIndex, "back");
    paintMainAnswer(state.flipTargetIndex);
  } else {
    paintSheetAnswer(state.currentIndex, "front");
    paintSheetAnswer(state.flipTargetIndex, "back");
    paintMainAnswer(state.currentIndex);
  }

  elements.turningSheet.classList.add("is-active");
  elements.turningSheet.setAttribute("aria-hidden", "false");
  setFlipTransform(0);
}

function resetFlip({ restoreCurrent = true } = {}) {
  if (restoreCurrent) paintMainAnswer(state.currentIndex);
  elements.turningSheet.classList.remove("is-active");
  elements.turningSheet.setAttribute("aria-hidden", "true");
  elements.turningSheet.style.transition = "none";
  elements.turningSheet.style.transform = "";
  elements.turningSheet.style.removeProperty("--flip-shadow");
  delete elements.turningSheet.dataset.direction;
  state.flipDirection = 0;
  state.flipProgress = 0;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function animatePreparedFlip(complete, duration) {
  setFlipTransform(complete ? 1 : 0, duration);
  await wait(duration + 24);

  if (complete) {
    state.currentIndex = state.flipTargetIndex;
    paintMainAnswer(state.currentIndex);
    playPageSound();
    vibrate(5);
  }

  resetFlip({ restoreCurrent: !complete });
}

async function runAutomaticFlip(direction) {
  prepareFlip(direction);
  await wait(32);
  await animatePreparedFlip(true, 390);
}

async function settleFlip(complete, extraPages = 0) {
  if (!state.flipDirection || state.isAnimating) return;
  state.isAnimating = true;
  const direction = state.flipDirection;
  const remaining = complete
    ? 1 - state.flipProgress
    : state.flipProgress;
  const duration = Math.max(170, Math.round(430 * remaining));

  await animatePreparedFlip(complete, duration);

  if (complete) {
    for (let page = 0; page < extraPages && state.isOpen; page += 1) {
      await wait(55);
      await runAutomaticFlip(direction);
    }
    playSettleSound();
  }

  state.isAnimating = false;
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
  resetFlip();

  const startingIndex = randomIndex();
  showAnswer(startingIndex, { animate: false });

  elements.book.dataset.state = "opening";
  elements.openBook.setAttribute("aria-hidden", "false");
  elements.openActions.hidden = false;
  elements.openActions.style.display = "flex";
  elements.statusText.hidden = true;

  if (mode === "random") {
    elements.questionCopy.textContent = "你问过的问题，已经被这一页听见";
    elements.openBook.classList.remove("swipe-enabled");
    elements.turnSurface.style.cursor = "default";
    elements.statusText.textContent = "轻触“再问一次”，可以重新抽取答案";
  } else {
    elements.questionCopy.textContent = "向左或向右滑动书页，松手后让它停下";
    elements.openBook.classList.add("swipe-enabled");
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
  state.isAnimating = false;
  resetFlip();
  elements.book.dataset.state = "closed";
  elements.openBook.setAttribute("aria-hidden", "true");
  elements.openBook.classList.remove("swipe-enabled");
  elements.openActions.hidden = true;
  elements.openActions.style.display = "";
  elements.statusText.hidden = false;
  elements.statusText.textContent = "先想好一个问题，再触碰书封";
  playCloseSound();
}

async function turnOnePage(direction) {
  if (
    !state.isOpen ||
    state.mode !== "swipe" ||
    state.isAnimating ||
    state.pointerId !== null
  ) {
    return;
  }
  state.isAnimating = true;
  await runAutomaticFlip(direction);
  playSettleSound();
  state.isAnimating = false;
}

function onPointerDown(event) {
  if (
    !state.isOpen ||
    state.mode !== "swipe" ||
    state.pointerId !== null ||
    state.isAnimating
  ) {
    return;
  }
  state.pointerId = event.pointerId;
  state.pointerStartX = event.clientX;
  state.pointerLastX = event.clientX;
  state.pointerLastTime = performance.now();
  state.pointerVelocity = 0;
  elements.openBook.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  if (event.pointerId !== state.pointerId) return;

  const now = performance.now();
  const deltaX = event.clientX - state.pointerLastX;
  const deltaTime = Math.max(8, now - state.pointerLastTime);
  state.pointerVelocity = state.pointerVelocity * 0.55 + (deltaX / deltaTime) * 0.45;
  const totalDelta = event.clientX - state.pointerStartX;

  if (Math.abs(totalDelta) > 3) {
    const direction = totalDelta < 0 ? 1 : -1;
    if (direction !== state.flipDirection) {
      if (state.flipDirection) resetFlip();
      prepareFlip(direction);
    }

    const pageWidth = Math.max(1, elements.openBook.clientWidth / 2);
    const progress = Math.min(0.985, Math.abs(totalDelta) / (pageWidth * 0.88));
    setFlipTransform(progress);
  }
  state.pointerLastX = event.clientX;
  state.pointerLastTime = now;
}

function onPointerEnd(event) {
  if (event.pointerId !== state.pointerId) return;
  state.pointerId = null;
  if (!state.flipDirection) return;

  const directedVelocity =
    -state.pointerVelocity * state.flipDirection;
  const complete =
    state.flipProgress >= 0.42 || directedVelocity > 0.38;
  const extraPages = complete
    ? Math.min(3, Math.max(0, Math.floor((directedVelocity - 0.8) * 1.4)))
    : 0;
  void settleFlip(complete, extraPages);
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
      if (state.mode === "random") {
        showAnswer(randomIndex());
      } else {
        void turnOnePage(1);
      }
    });

    elements.openBook.addEventListener("pointerdown", onPointerDown);
    elements.openBook.addEventListener("pointermove", onPointerMove);
    elements.openBook.addEventListener("pointerup", onPointerEnd);
    elements.openBook.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.modePickerOpen) hideModePicker();
        else if (state.isOpen) closeBook();
      }
      if (state.isOpen && state.mode === "swipe") {
        if (event.key === "ArrowLeft") void turnOnePage(-1);
        if (event.key === "ArrowRight") void turnOnePage(1);
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
