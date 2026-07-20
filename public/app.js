const elements = {
  answerContent: document.querySelector("#answerContent"),
  answerNumber: document.querySelector("#answerNumber"),
  answerText: document.querySelector("#answerText"),
  blockBendSlices: [...document.querySelectorAll(".block-bend-slice")],
  blockLagPages: [...document.querySelectorAll(".block-lag-page")],
  book: document.querySelector("#book"),
  bookShadow: document.querySelector(".book-shadow"),
  browseModeHint: document.querySelector("#browseModeHint"),
  closeButton: document.querySelector("#closeButton"),
  coverButton: document.querySelector("#coverButton"),
  errorToast: document.querySelector("#errorToast"),
  guideButton: document.querySelector("#guideButton"),
  guideCard: document.querySelector("#guideCard"),
  guideContinue: document.querySelector("#guideContinue"),
  guideCopy: document.querySelector("#guideCopy"),
  guideCuePrimary: document.querySelector("#guideCuePrimary"),
  guideCuePrimaryIcon: document.querySelector("#guideCuePrimaryIcon"),
  guideCuePrimaryLabel: document.querySelector("#guideCuePrimaryLabel"),
  guideCueSecondary: document.querySelector("#guideCueSecondary"),
  guideCueSecondaryIcon: document.querySelector("#guideCueSecondaryIcon"),
  guideCueSecondaryLabel: document.querySelector("#guideCueSecondaryLabel"),
  guideFocus: document.querySelector("#guideFocus"),
  guideLayer: document.querySelector("#guideLayer"),
  guideReplayHint: document.querySelector("#guideReplayHint"),
  guideSkip: document.querySelector("#guideSkip"),
  guideStep: document.querySelector("#guideStep"),
  guideTitle: document.querySelector("#guideTitle"),
  loadingScreen: document.querySelector("#loadingScreen"),
  openActions: document.querySelector("#openActions"),
  openBook: document.querySelector("#openBook"),
  pageNavigator: document.querySelector("#pageNavigator"),
  pageNumber: document.querySelector("#pageNumber"),
  pageTrack: document.querySelector("#pageTrack"),
  pageTrackFill: document.querySelector("#pageTrackFill"),
  pageTrackInstruction: document.querySelector("#pageTrackInstruction"),
  pageTrackThumb: document.querySelector("#pageTrackThumb"),
  questionCopy: document.querySelector("#questionCopy"),
  randomModeHint: document.querySelector("#randomModeHint"),
  againButton: document.querySelector("#againButton"),
  soundButton: document.querySelector("#soundButton"),
  soundLabel: document.querySelector("#soundLabel"),
  statusText: document.querySelector("#statusText"),
  themeButton: document.querySelector("#themeButton"),
  themeColor: document.querySelector("#themeColor"),
  themeLabel: document.querySelector("#themeLabel"),
  thickPageBlock: document.querySelector("#thickPageBlock"),
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
  currentIndex: -1,
  openingMethod: null,
  coverPointerId: null,
  coverPointerStartX: 0,
  coverPointerStartY: 0,
  coverPointerMoved: false,
  suppressCoverClick: false,
  flipDirection: 0,
  flipProgress: 0,
  flipTargetIndex: 0,
  guideActive: false,
  guideHideTimer: null,
  guidePath: "full",
  guidePositionTimers: [],
  guideReplayHintTimer: null,
  guidePracticeDragDone: false,
  guidePracticeReadyToClose: false,
  guidePracticeTapDone: false,
  guideStep: 0,
  browseModeHintTimer: null,
  randomModeHintTimer: null,
  isAnimating: false,
  isOpen: false,
  navigationToken: 0,
  openPointerDirection: 0,
  openPointerId: null,
  openPointerStartX: 0,
  openPointerStartY: 0,
  suppressOpenClick: false,
  scrubPointerId: null,
  scrubTargetIndex: 0,
  trackPointerStartX: 0,
  trackPointerMoved: false,
  soundEnabled: true
};

const THEME_STORAGE_KEY = "aqi-answer-book-theme";
const GUIDE_STORAGE_KEY = "aqi-answer-book-guide-v1";
const GUIDE_BASIC_STORAGE_KEY = "aqi-answer-book-guide-basic-v2";
const GUIDE_BROWSE_STORAGE_KEY = "aqi-answer-book-guide-browse-v2";
const BROWSE_MODE_HINT_STORAGE_KEY = "aqi-answer-book-browse-mode-hint-v1";
const RANDOM_MODE_HINT_STORAGE_KEY = "aqi-answer-book-random-mode-hint-v1";
const GUIDE_REPLAY_HINT_STORAGE_KEY = "aqi-answer-book-guide-replay-hint-v1";

function usesCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function readGuideCompleted() {
  try {
    return (
      localStorage.getItem(GUIDE_BASIC_STORAGE_KEY) === "completed" ||
      localStorage.getItem(GUIDE_STORAGE_KEY) === "completed"
    );
  } catch {
    return false;
  }
}

function persistGuideCompleted() {
  try {
    localStorage.setItem(GUIDE_BASIC_STORAGE_KEY, "completed");
    if (state.guidePath === "full") {
      localStorage.setItem(GUIDE_BROWSE_STORAGE_KEY, "completed");
    }
    localStorage.setItem(GUIDE_STORAGE_KEY, "completed");
  } catch {
    // The guide still closes for this visit when storage is unavailable.
  }
}

function readBrowseGuideCompleted() {
  try {
    return localStorage.getItem(GUIDE_BROWSE_STORAGE_KEY) === "completed";
  } catch {
    return false;
  }
}

function readBrowseModeHintSeen() {
  try {
    return localStorage.getItem(BROWSE_MODE_HINT_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function persistBrowseModeHintSeen() {
  try {
    localStorage.setItem(BROWSE_MODE_HINT_STORAGE_KEY, "seen");
  } catch {
    // The hint still dismisses for this visit when storage is unavailable.
  }
}

function hideBrowseModeHint({ persist = true } = {}) {
  if (state.browseModeHintTimer !== null) {
    clearTimeout(state.browseModeHintTimer);
    state.browseModeHintTimer = null;
  }
  elements.browseModeHint.classList.remove("is-visible");
  if (persist) persistBrowseModeHintSeen();
  setTimeout(() => {
    if (!elements.browseModeHint.classList.contains("is-visible")) {
      elements.browseModeHint.hidden = true;
    }
  }, 240);
}

function showBrowseModeHint() {
  if (
    state.isOpen ||
    state.guideActive ||
    readBrowseGuideCompleted() ||
    readBrowseModeHintSeen()
  ) {
    return;
  }
  elements.browseModeHint.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!state.isOpen && !state.guideActive) {
        elements.browseModeHint.classList.add("is-visible");
      }
    });
  });
  state.browseModeHintTimer = setTimeout(hideBrowseModeHint, 5000);
}

function readRandomModeHintSeen() {
  try {
    return localStorage.getItem(RANDOM_MODE_HINT_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function persistRandomModeHintSeen() {
  try {
    localStorage.setItem(RANDOM_MODE_HINT_STORAGE_KEY, "seen");
  } catch {
    // The hint still dismisses for this visit when storage is unavailable.
  }
}

function hideRandomModeHint({ persist = true } = {}) {
  if (state.randomModeHintTimer !== null) {
    clearTimeout(state.randomModeHintTimer);
    state.randomModeHintTimer = null;
  }
  elements.randomModeHint.classList.remove("is-visible");
  if (persist) persistRandomModeHintSeen();
  setTimeout(() => {
    if (!elements.randomModeHint.classList.contains("is-visible")) {
      elements.randomModeHint.hidden = true;
    }
  }, 240);
}

function showRandomModeHint() {
  if (
    state.isOpen ||
    state.guideActive ||
    readRandomModeHintSeen()
  ) {
    return;
  }
  elements.randomModeHint.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!state.isOpen && !state.guideActive) {
        elements.randomModeHint.classList.add("is-visible");
      }
    });
  });
  state.randomModeHintTimer = setTimeout(hideRandomModeHint, 5000);
}

function readGuideReplayHintSeen() {
  try {
    return localStorage.getItem(GUIDE_REPLAY_HINT_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function persistGuideReplayHintSeen() {
  try {
    localStorage.setItem(GUIDE_REPLAY_HINT_STORAGE_KEY, "seen");
  } catch {
    // The hint still dismisses for this visit when storage is unavailable.
  }
}

function hideGuideReplayHint({ persist = true } = {}) {
  if (state.guideReplayHintTimer !== null) {
    clearTimeout(state.guideReplayHintTimer);
    state.guideReplayHintTimer = null;
  }
  elements.guideReplayHint.classList.remove("is-visible");
  if (persist) persistGuideReplayHintSeen();
  setTimeout(() => {
    if (!elements.guideReplayHint.classList.contains("is-visible")) {
      elements.guideReplayHint.hidden = true;
    }
  }, 220);
}

function showGuideReplayHint({ force = false } = {}) {
  if (
    state.guideActive ||
    (!force && readGuideReplayHintSeen()) ||
    elements.guideReplayHint.classList.contains("is-visible")
  ) {
    return;
  }

  elements.guideReplayHint.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!state.guideActive) {
        elements.guideReplayHint.classList.add("is-visible");
      }
    });
  });
  state.guideReplayHintTimer = setTimeout(
    () => hideGuideReplayHint(),
    5600
  );
}

function guideCopyForStep(step) {
  const coarse = usesCoarsePointer();
  if (step === 2 && state.guidePath === "quick") {
    return {
      title: "这一页已经回答你了",
      copy: coarse
        ? "轻触书页即可合上。想继续看看，也仍然可以左右滑动书页。"
        : "点击书页即可合上。想继续看看，也仍然可以左右拖拽书页。"
    };
  }
  const copies = [
    {
      title: "先问一个问题",
      copy: coarse
        ? "轻触封面，随机打开一个答案。向左滑动，则从第 000 页开始翻阅。"
        : "点击封面，随机打开一个答案。向左拖拽，则从第 000 页开始翻阅。"
    },
    {
      title: "像翻真书一样",
      copy: coarse
        ? "从左页或右页开始滑动，可以向前或向后翻页。轻触书页，会合上这本书。"
        : "从左页或右页开始拖拽，可以向前或向后翻页。点击书页，会合上这本书。"
    },
    {
      title: "在某一页停下",
      copy: coarse
        ? "在进度条上向左或向右滑动一次，再轻触任意位置。顺序不限，两个动作都完成后指南才会结束。"
        : "在进度条上向左或向右拖动一次，再点击任意位置。顺序不限，两个动作都完成后指南才会结束。"
    }
  ];
  return copies[step];
}

function guideVisualForStep(step) {
  const coarse = usesCoarsePointer();
  if (step === 2 && state.guidePath === "quick") {
    return {
      primaryIcon: "hand-click",
      primaryLabel: coarse ? "轻触书页关闭" : "点击书页关闭",
      secondaryIcon: "swipe-left",
      secondaryLabel: coarse ? "仍可左右滑动" : "仍可左右拖拽"
    };
  }
  const visuals = [
    {
      primaryIcon: "hand-click",
      primaryLabel: coarse ? "轻触随机打开" : "点击随机打开",
      secondaryIcon: "swipe-left",
      secondaryLabel: coarse ? "左滑从 000 开始" : "左拖从 000 开始"
    },
    {
      primaryIcon: "swipe-left",
      primaryLabel: coarse ? "从右页滑动" : "从右页拖拽",
      secondaryIcon: "swipe-right",
      secondaryLabel: coarse ? "从左页滑动" : "从左页拖拽"
    },
    {
      primaryIcon: "hand-move",
      primaryLabel: coarse ? "任意方向滑动" : "任意方向拖动",
      secondaryIcon: "hand-click",
      secondaryLabel: coarse ? "轻触进度条" : "点击进度条"
    }
  ];
  return visuals[step];
}

function guideTargetForStep(step) {
  if (step === 0) return elements.coverButton;
  if (step === 1) return elements.openBook;
  if (state.guidePath === "quick") return elements.openBook;
  return state.guidePracticeReadyToClose
    ? elements.openBook
    : elements.pageNavigator;
}

function clearGuidePositionTimers() {
  state.guidePositionTimers.forEach((timer) => clearTimeout(timer));
  state.guidePositionTimers = [];
}

function positionGuide() {
  if (!state.guideActive || elements.guideLayer.hidden) return;
  const target = guideTargetForStep(state.guideStep);
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const focusPadding = state.guideStep === 2 ? 8 : 10;
  const focusLeft = Math.max(8, rect.left - focusPadding);
  const focusTop = Math.max(8, rect.top - focusPadding);
  const focusRight = Math.min(viewportWidth - 8, rect.right + focusPadding);
  const focusBottom = Math.min(viewportHeight - 8, rect.bottom + focusPadding);

  Object.assign(elements.guideFocus.style, {
    left: `${focusLeft}px`,
    top: `${focusTop}px`,
    width: `${Math.max(24, focusRight - focusLeft)}px`,
    height: `${Math.max(24, focusBottom - focusTop)}px`,
    borderRadius: state.guideStep === 2 ? "16px" : "18px"
  });

  const cardWidth = Math.min(330, viewportWidth - 32);
  const cardHeight = elements.guideCard.offsetHeight || 224;
  const centeredLeft = rect.left + rect.width / 2 - cardWidth / 2;
  const cardLeft = Math.max(16, Math.min(viewportWidth - cardWidth - 16, centeredLeft));
  const spaceBelow = viewportHeight - focusBottom;
  const spaceAbove = focusTop;
  let cardTop;

  if (spaceBelow >= cardHeight + 18) {
    cardTop = focusBottom + 16;
  } else if (spaceAbove >= cardHeight + 18) {
    cardTop = focusTop - cardHeight - 16;
  } else {
    cardTop = Math.max(16, viewportHeight - cardHeight - 24);
  }

  Object.assign(elements.guideCard.style, {
    left: `${cardLeft}px`,
    top: `${cardTop}px`,
    width: `${cardWidth}px`
  });
}

function scheduleGuidePosition() {
  clearGuidePositionTimers();
  [0, 120, 420, 940].forEach((delay) => {
    state.guidePositionTimers.push(setTimeout(positionGuide, delay));
  });
}

function showGuideStep(step) {
  if (!state.guideActive) return;
  const previousStep = state.guideStep;

  if (step > 0 && !state.isOpen) {
    state.guideStep = 0;
  } else {
    state.guideStep = Math.max(0, Math.min(2, step));
  }

  if (state.guideStep === 2 && previousStep !== 2) {
    state.guidePracticeDragDone = false;
    state.guidePracticeReadyToClose = state.guidePath === "quick";
    state.guidePracticeTapDone = false;
  }

  const copy = guideCopyForStep(state.guideStep);
  const visual = guideVisualForStep(state.guideStep);
  elements.guideStep.textContent =
    state.guidePath === "quick" && state.guideStep === 2
      ? "02 / 02"
      : `0${state.guideStep + 1} / 03`;
  elements.guideTitle.textContent = copy.title;
  elements.guideCopy.textContent = copy.copy;
  elements.guideCuePrimaryIcon.dataset.icon = visual.primaryIcon;
  elements.guideCuePrimaryLabel.textContent = visual.primaryLabel;
  elements.guideCueSecondaryIcon.dataset.icon = visual.secondaryIcon;
  elements.guideCueSecondaryLabel.textContent = visual.secondaryLabel;
  elements.guideCuePrimary.classList.toggle(
    "is-complete",
    state.guideStep === 2 && state.guidePracticeDragDone
  );
  elements.guideCueSecondary.classList.toggle(
    "is-complete",
    state.guideStep === 2 && state.guidePracticeTapDone
  );
  elements.guideContinue.hidden = state.guideStep !== 1;
  elements.guideContinue.textContent = "继续";
  elements.guideCard.dataset.guideStep = String(state.guideStep);
  elements.guideCard.dataset.guidePath = state.guidePath;
  elements.guideCard.dataset.guidePhase =
    state.guidePath === "quick" && state.guideStep === 2
      ? "close"
      : "progress";
  scheduleGuidePosition();
}

function startGuide() {
  hideBrowseModeHint({ persist: !elements.browseModeHint.hidden });
  hideRandomModeHint({ persist: !elements.randomModeHint.hidden });
  hideGuideReplayHint({ persist: !elements.guideReplayHint.hidden });
  if (state.guideHideTimer !== null) {
    clearTimeout(state.guideHideTimer);
    state.guideHideTimer = null;
  }
  state.guideActive = true;
  state.guidePath =
    state.isOpen && state.openingMethod === "random" ? "quick" : "full";
  state.guidePracticeDragDone = false;
  state.guidePracticeReadyToClose = state.guidePath === "quick";
  state.guidePracticeTapDone = false;
  elements.guideLayer.classList.remove("is-visible");
  elements.guideLayer.hidden = false;
  document.documentElement.classList.add("guide-is-active");
  showGuideStep(
    state.isOpen ? (state.guidePath === "quick" ? 2 : 1) : 0
  );
  requestAnimationFrame(() => {
    positionGuide();
    requestAnimationFrame(() => {
      if (state.guideActive) elements.guideLayer.classList.add("is-visible");
    });
  });
}

function completeGuide({ persist = true, replayDelay = 360 } = {}) {
  state.guideActive = false;
  clearGuidePositionTimers();
  elements.guideLayer.classList.remove("is-visible");
  document.documentElement.classList.remove("guide-is-active");
  if (persist) persistGuideCompleted();
  state.guideHideTimer = setTimeout(() => {
    if (!state.guideActive) elements.guideLayer.hidden = true;
    state.guideHideTimer = null;
  }, 180);
  setTimeout(() => showGuideReplayHint({ force: true }), replayDelay);
  elements.guideButton.focus({ preventScroll: true });
}

function advanceGuideAfterOpening() {
  if (!state.guideActive || state.guideStep !== 0) return;
  state.guidePath = state.openingMethod === "random" ? "quick" : "full";
  setTimeout(() => {
    if (state.guideActive && state.isOpen) {
      showGuideStep(state.guidePath === "quick" ? 2 : 1);
    }
  }, 940);
}

function advanceGuideAfterPageTurn() {
  if (!state.guideActive || state.guideStep !== 1) return;
  setTimeout(() => {
    if (state.guideActive && state.isOpen) showGuideStep(2);
  }, 360);
}

function recordGuideProgressPractice(action) {
  if (
    !state.guideActive ||
    state.guideStep !== 2 ||
    state.guidePath !== "full"
  ) {
    return;
  }
  if (action === "drag") state.guidePracticeDragDone = true;
  if (action === "tap") state.guidePracticeTapDone = true;

  elements.guideCuePrimary.classList.toggle(
    "is-complete",
    state.guidePracticeDragDone
  );
  elements.guideCueSecondary.classList.toggle(
    "is-complete",
    state.guidePracticeTapDone
  );

  if (state.guidePracticeDragDone && state.guidePracticeTapDone) {
    state.guidePracticeReadyToClose = true;
    elements.guideTitle.textContent = "最后，合上这本书";
    elements.guideCopy.textContent = usesCoarsePointer()
      ? "进度条的两个动作都完成了。现在轻触任意书页，把书合上。"
      : "进度条的两个动作都完成了。现在点击任意书页，把书合上。";
    elements.guideCuePrimaryIcon.dataset.icon = "hand-move";
    elements.guideCuePrimaryLabel.textContent = "进度条操作完成";
    elements.guideCuePrimary.classList.add("is-complete");
    elements.guideCueSecondaryIcon.dataset.icon = "hand-click";
    elements.guideCueSecondaryLabel.textContent = usesCoarsePointer()
      ? "轻触书页关闭"
      : "点击书页关闭";
    elements.guideCueSecondary.classList.remove("is-complete");
    elements.guideCard.dataset.guidePhase = "close";
    scheduleGuidePosition();
  } else if (state.guidePracticeDragDone) {
    elements.guideCopy.textContent = usesCoarsePointer()
      ? "滑动完成。现在轻触进度条上的任意位置。"
      : "拖动完成。现在点击进度条上的任意位置。";
  } else {
    elements.guideCopy.textContent = usesCoarsePointer()
      ? "轻触完成。现在向左或向右滑动进度条。"
      : "点击完成。现在向左或向右拖动进度条。";
  }
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "classic"
      ? "classic"
      : "forest";
  } catch {
    return "forest";
  }
}

function applyTheme(theme, { persist = false } = {}) {
  const nextTheme = theme === "forest" ? "forest" : "classic";
  const isForest = nextTheme === "forest";
  document.documentElement.dataset.theme = nextTheme;
  elements.themeButton.setAttribute("aria-pressed", String(isForest));
  elements.themeButton.setAttribute(
    "aria-label",
    isForest ? "切换至原典主题" : "切换至森境主题"
  );
  elements.themeLabel.textContent = isForest ? "森境" : "原典";
  elements.themeColor.setAttribute("content", isForest ? "#04110d" : "#111b2b");

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The theme still applies for this visit when storage is unavailable.
    }
  }
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "forest" ? "classic" : "forest";
  applyTheme(nextTheme, { persist: true });
  if (state.soundEnabled) playTapSound();
}

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

function indexLabel(index) {
  if (index < 0) return "000";
  return pageLabel(state.answers[index]);
}

function normalizedIndex(index) {
  const length = state.answers.length;
  return ((index % length) + length) % length;
}

function paintAnswer(answer, textNode, numberNode, pageNode) {
  const label = pageLabel(answer);

  textNode.textContent = answer.text;
  numberNode.textContent = "ANSWER";
  pageNode.textContent = label;
}

function paintMainAnswer(index) {
  if (index < 0) {
    elements.answerText.textContent =
      "答案尚未抵达。向左翻页，在心有回响之处停下。";
    elements.answerNumber.textContent = "BEGIN · 000";
    elements.pageNumber.textContent = "000";
    return;
  }
  paintAnswer(
    state.answers[normalizedIndex(index)],
    elements.answerText,
    elements.answerNumber,
    elements.pageNumber
  );
}

function paintSheetAnswer(index, side) {
  if (index < 0) {
    const textNode =
      side === "front" ? elements.sheetFrontText : elements.sheetBackText;
    const numberNode =
      side === "front" ? elements.sheetFrontNumber : elements.sheetBackNumber;
    const pageNode =
      side === "front" ? elements.sheetFrontPage : elements.sheetBackPage;
    textNode.textContent =
      "答案尚未抵达。向左翻页，在心有回响之处停下。";
    numberNode.textContent = "BEGIN · 000";
    pageNode.textContent = "000";
    return;
  }
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
  state.currentIndex = index < 0 ? -1 : normalizedIndex(index);
  paintMainAnswer(state.currentIndex);
  updateBookThickness(state.currentIndex);
  updateNavigator(state.currentIndex);

  if (animate) {
    elements.answerContent.classList.remove("answer-change");
    void elements.answerContent.offsetWidth;
    elements.answerContent.classList.add("answer-change");
  }
}

function updateBookThickness(index) {
  if (state.answers.length <= 1) return;
  const ratio =
    index < 0 ? 0 : normalizedIndex(index) / (state.answers.length - 1);
  const minimumDepth = 4;
  const maximumExtraDepth = 13;
  const leftDepth = minimumDepth + ratio * maximumExtraDepth;
  const rightDepth = minimumDepth + (1 - ratio) * maximumExtraDepth;

  elements.openBook.style.setProperty(
    "--left-stack-depth",
    `${leftDepth.toFixed(2)}px`
  );
  elements.openBook.style.setProperty(
    "--right-stack-depth",
    `${rightDepth.toFixed(2)}px`
  );
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

function prepareFlip(direction, targetIndex = state.currentIndex + direction) {
  state.flipDirection = direction;
  state.flipTargetIndex =
    targetIndex < 0 ? -1 : normalizedIndex(targetIndex);
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

async function animatePreparedFlip(complete, duration, { quiet = false } = {}) {
  if (complete) {
    await animateLeafTurn(state.flipDirection, duration);
  } else {
    setFlipTransform(0, duration);
    await wait(duration + 24);
  }

  if (complete) {
    state.currentIndex = state.flipTargetIndex;
    paintMainAnswer(state.currentIndex);
    updateBookThickness(state.currentIndex);
    if (!quiet) {
      playPageSound();
      vibrate(5);
    }
  }

  resetFlip({ restoreCurrent: !complete });
}

async function animateLeafTurn(direction, duration) {
  const sign = -direction;
  elements.turningSheet.style.transition = "none";
  elements.turningSheet.style.setProperty("--leaf-duration", `${duration}ms`);
  elements.turningSheet.style.setProperty("--flip-shadow", "1");
  elements.turningSheet.classList.add("is-curling");

  const animation = elements.turningSheet.animate(
    [
      {
        transform: "rotateY(0deg) rotateZ(0deg) translateZ(2px) scaleX(1)",
        offset: 0
      },
      {
        transform:
          `rotateY(${sign * 60}deg) rotateZ(${sign * 0.7}deg) ` +
          "translateZ(9px) scaleX(0.992)",
        offset: 0.333
      },
      {
        transform:
          `rotateY(${sign * 120}deg) rotateZ(${sign * -0.38}deg) ` +
          "translateZ(15px) scaleX(0.973)",
        offset: 0.667
      },
      {
        transform:
          `rotateY(${sign * 180}deg) rotateZ(0deg) translateZ(2px) scaleX(1)`,
        offset: 1
      }
    ],
    {
      duration,
      fill: "forwards",
      easing: "linear"
    }
  );

  try {
    await animation.finished;
  } catch {
    // Closing the book can cancel an in-flight page animation.
  }

  elements.turningSheet.style.transform =
    `rotateY(${sign * 180}deg) translateZ(2px)`;
  animation.cancel();
  elements.turningSheet.classList.remove("is-curling");
  elements.turningSheet.style.removeProperty("--leaf-duration");
  state.flipProgress = 1;
}

async function runAutomaticFlip(
  direction,
  targetIndex = state.currentIndex + direction,
  duration = 390,
  { quiet = false } = {}
) {
  prepareFlip(direction, targetIndex);
  await animatePreparedFlip(true, duration, { quiet });
}

function updateNavigator(index) {
  const boundedIndex = Math.max(-1, Math.min(state.answers.length - 1, index));
  const percent =
    state.answers.length === 0
      ? 0
      : ((boundedIndex + 1) / state.answers.length) * 100;
  const label = indexLabel(boundedIndex);

  elements.pageNavigator.style.setProperty("--page-position", `${percent}%`);
  elements.pageTrack.setAttribute("aria-valuenow", String(boundedIndex + 1));
  elements.pageTrack.setAttribute("aria-valuetext", `第 ${label} 页`);
  state.scrubTargetIndex = boundedIndex;
}

function setNavigatorVisible(visible) {
  elements.pageNavigator.classList.toggle("is-visible", visible);
  elements.pageNavigator.setAttribute("aria-hidden", String(!visible));
  elements.pageNavigator.inert = !visible;
}

function revealAnswer() {
  elements.answerContent.classList.remove("answer-reveal");
  void elements.answerContent.offsetWidth;
  elements.answerContent.classList.add("answer-reveal");
}

function beginNavigation(target) {
  state.isAnimating = true;
  elements.openBook.classList.add("is-seeking");
  elements.pageNavigator.classList.add("is-turning");
  elements.pageTrackInstruction.textContent =
    `正在翻到第 ${indexLabel(target)} 页`;
}

function finishNavigation(target) {
  state.currentIndex = target;
  paintMainAnswer(target);
  updateBookThickness(target);
  elements.openBook.classList.remove("is-seeking", "is-block-turning");
  elements.pageNavigator.classList.remove("is-turning");
  elements.pageTrackInstruction.textContent = "滑动薄页 · 点击翻动厚页";
  revealAnswer();
  playSettleSound();
  vibrate(8);
  state.isAnimating = false;
}

async function navigateWithLeaves(target, navigationToken) {
  const startIndex = state.currentIndex;
  const distance = target - startIndex;
  const direction = Math.sign(distance);
  const flipCount = Math.min(16, Math.max(1, Math.abs(distance)));

  for (let step = 1; step <= flipCount; step += 1) {
    if (
      navigationToken !== state.navigationToken ||
      !state.isOpen
    ) {
      return false;
    }

    const progress = step / flipCount;
    let intermediateIndex =
      step === flipCount
        ? target
        : Math.round(startIndex + distance * progress);

    if (intermediateIndex === state.currentIndex) {
      intermediateIndex = Math.max(
        -1,
        Math.min(
          state.answers.length - 1,
          state.currentIndex + direction
        )
      );
    }

    const duration = Math.max(118, 160 - flipCount * 2);

    await runAutomaticFlip(
      direction,
      intermediateIndex,
      duration,
      { quiet: step !== flipCount }
    );
  }

  return true;
}

function resetThickBlock() {
  for (const layer of [
    ...elements.blockBendSlices,
    ...elements.blockLagPages
  ]) {
    layer.getAnimations().forEach((animation) => animation.cancel());
    layer.style.transform = "";
  }
  elements.thickPageBlock.classList.remove("is-active");
  elements.thickPageBlock.classList.remove("is-bending");
  elements.thickPageBlock.setAttribute("aria-hidden", "true");
  elements.thickPageBlock.style.transition = "none";
  elements.thickPageBlock.style.transform = "";
  delete elements.thickPageBlock.dataset.direction;
}

function animateBlockLayers(direction, duration, phase) {
  const relativeSign = direction > 0 ? 1 : -1;
  const sliceOffsets = elements.blockBendSlices.map((_, index) => {
    const distanceFromSpine = direction > 0 ? index : 7 - index;
    return relativeSign * distanceFromSpine * 4.15;
  });
  const lagOffsets = [11, 20, 30].map((offset) => relativeSign * offset);

  const sliceAnimations = elements.blockBendSlices.map((slice, index) => {
    const offset = sliceOffsets[index];
    const keyframes =
      phase === "lift"
        ? [
            {
              transform:
                `rotateY(0deg) translateZ(var(--block-half-depth))`
            },
            {
              transform:
                `rotateY(${offset}deg) translateZ(calc(var(--block-half-depth) + ` +
                `${Math.sin((index / 7) * Math.PI) * 16}px))`
            }
          ]
        : [
            {
              transform:
                `rotateY(${offset}deg) translateZ(calc(var(--block-half-depth) + ` +
                `${Math.sin((index / 7) * Math.PI) * 16}px))`,
              offset: 0
            },
            {
              transform:
                `rotateY(${offset * -0.36}deg) ` +
                "translateZ(calc(var(--block-half-depth) + 5px))",
              offset: 0.72
            },
            {
              transform:
                "rotateY(0deg) translateZ(var(--block-half-depth))",
              offset: 1
            }
          ];

    return slice.animate(keyframes, {
      duration,
      easing:
        phase === "lift"
          ? "cubic-bezier(0.28, 0.02, 0.58, 1)"
          : "cubic-bezier(0.2, 0.72, 0.24, 1)",
      fill: "forwards"
    });
  });

  const lagAnimations = elements.blockLagPages.map((page, index) => {
    const offset = lagOffsets[index];
    const depth = -2 - index * 3;
    const keyframes =
      phase === "lift"
        ? [
            {
              transform: `rotateY(0deg) translateZ(${depth}px)`,
              opacity: 0.12
            },
            {
              transform: `rotateY(${offset}deg) translateZ(${depth - 2}px)`,
              opacity: 0.82 - index * 0.18
            }
          ]
        : [
            {
              transform: `rotateY(${offset}deg) translateZ(${depth - 2}px)`,
              offset: 0
            },
            {
              transform:
                `rotateY(${offset * -0.28}deg) translateZ(${depth + 1}px)`,
              offset: 0.78
            },
            {
              transform: `rotateY(0deg) translateZ(${depth}px)`,
              offset: 1
            }
          ];

    return page.animate(keyframes, {
      duration: duration + index * 34,
      delay: phase === "lift" ? index * 24 : index * 18,
      easing:
        phase === "lift"
          ? "cubic-bezier(0.32, 0, 0.6, 1)"
          : "cubic-bezier(0.18, 0.72, 0.22, 1)",
      fill: "forwards"
    });
  });

  return [...sliceAnimations, ...lagAnimations];
}

async function animateBookLanding(direction) {
  const sign = direction > 0 ? 1 : -1;
  const animation = elements.openBook.animate(
    [
      { transform: "rotateX(2deg) scale(1) translateY(0) rotateZ(0deg)" },
      {
        transform:
          `rotateX(2.35deg) scale(0.998) translateY(2.4px) ` +
          `rotateZ(${sign * 0.12}deg)`,
        offset: 0.42
      },
      {
        transform:
          `rotateX(1.9deg) scale(1.001) translateY(-0.8px) ` +
          `rotateZ(${sign * -0.04}deg)`,
        offset: 0.72
      },
      { transform: "rotateX(2deg) scale(1) translateY(0) rotateZ(0deg)" }
    ],
    {
      duration: 280,
      easing: "ease-out"
    }
  );

  try {
    await animation.finished;
  } catch {
    // Closing the book can cancel the landing response.
  }
}

async function navigateWithPageBlock(target, navigationToken) {
  const startIndex = state.currentIndex;
  const distance = target - startIndex;
  const direction = Math.sign(distance);
  const distanceRatio = Math.abs(distance) / (state.answers.length - 1);
  const depth = 12 + Math.min(22, 8 + distanceRatio * 28);
  const duration = 920 + Math.round(distanceRatio * 260);
  const angle = direction > 0 ? -180 : 180;
  const uprightAngle = angle * 0.48;
  const firstPhase = Math.round(duration * 0.48);
  const secondPhase = duration - firstPhase;

  elements.openBook.style.setProperty("--block-depth", `${depth.toFixed(1)}px`);
  elements.openBook.style.setProperty(
    "--block-half-depth",
    `${(depth / 2).toFixed(1)}px`
  );
  elements.openBook.classList.add("is-block-turning");
  elements.thickPageBlock.dataset.direction =
    direction > 0 ? "forward" : "backward";
  elements.thickPageBlock.classList.add("is-active");
  elements.thickPageBlock.classList.add("is-bending");
  elements.thickPageBlock.setAttribute("aria-hidden", "false");
  elements.thickPageBlock.style.transition = "none";
  elements.thickPageBlock.style.transform = "rotateY(0deg) translateZ(4px)";
  void elements.thickPageBlock.offsetWidth;
  elements.thickPageBlock.style.transition =
    `transform ${firstPhase}ms linear`;
  elements.thickPageBlock.style.transform =
    `rotateY(${uprightAngle}deg) rotateZ(${direction * -0.35}deg) translateZ(12px)`;
  const liftLayerAnimations = animateBlockLayers(
    direction,
    firstPhase,
    "lift"
  );
  const liftShadowAnimation = elements.bookShadow.animate(
    [
      { transform: "translate(-50%, -50%) scaleX(1)", opacity: 0.72 },
      { transform: "translate(-50%, -50%) scaleX(0.82)", opacity: 0.46 }
    ],
    {
      duration: firstPhase,
      fill: "forwards",
      easing: "ease-in-out"
    }
  );
  playBlockSound(depth);

  await wait(firstPhase);
  if (
    navigationToken !== state.navigationToken ||
    !state.isOpen
  ) {
    resetThickBlock();
    return false;
  }

  state.currentIndex = target;
  paintMainAnswer(target);
  updateBookThickness(target);
  liftShadowAnimation.cancel();

  elements.thickPageBlock.style.transition =
    `transform ${secondPhase}ms linear`;
  elements.thickPageBlock.style.transform =
    `rotateY(${angle}deg) rotateZ(${direction * 0.12}deg) translateZ(4px)`;
  const settleLayerAnimations = animateBlockLayers(
    direction,
    secondPhase,
    "settle"
  );
  const settleShadowAnimation = elements.bookShadow.animate(
    [
      { transform: "translate(-50%, -50%) scaleX(0.82)", opacity: 0.46 },
      { transform: "translate(-50%, -50%) scaleX(1.035)", opacity: 0.78, offset: 0.78 },
      { transform: "translate(-50%, -50%) scaleX(1)", opacity: 0.72 }
    ],
    {
      duration: secondPhase,
      easing: "ease-out"
    }
  );

  await wait(secondPhase);
  await animateBookLanding(direction);
  settleShadowAnimation.cancel();
  for (const animation of [
    ...liftLayerAnimations,
    ...settleLayerAnimations
  ]) {
    animation.cancel();
  }
  resetThickBlock();
  return navigationToken === state.navigationToken && state.isOpen;
}

async function navigateToIndex(targetIndex, { interaction = "drag" } = {}) {
  if (
    !state.isOpen ||
    state.isAnimating
  ) {
    return;
  }

  const target = Math.max(-1, Math.min(state.answers.length - 1, targetIndex));
  updateNavigator(target);

  if (target === state.currentIndex) {
    elements.openBook.classList.remove("is-seeking");
    elements.pageNavigator.classList.remove("is-turning");
    elements.pageTrackInstruction.textContent = "滑动薄页 · 点击翻动厚页";
    revealAnswer();
    return;
  }

  const navigationToken = ++state.navigationToken;
  beginNavigation(target);
  const completed =
    interaction === "click"
      ? await navigateWithPageBlock(target, navigationToken)
      : await navigateWithLeaves(target, navigationToken);

  if (!completed || navigationToken !== state.navigationToken) return;
  finishNavigation(target);
}

function targetIndexFromClientX(clientX) {
  const rect = elements.pageTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return Math.round(ratio * state.answers.length) - 1;
}

function updateScrubPosition(clientX) {
  const target = targetIndexFromClientX(clientX);
  updateNavigator(target);
  elements.pageTrackInstruction.textContent =
    `松手后逐页翻到第 ${indexLabel(target)} 页`;
}

function onTrackPointerDown(event) {
  if (
    !state.isOpen ||
    state.isAnimating ||
    state.scrubPointerId !== null
  ) {
    return;
  }

  state.scrubPointerId = event.pointerId;
  state.trackPointerStartX = event.clientX;
  state.trackPointerMoved = false;
  elements.pageTrack.setPointerCapture(event.pointerId);
}

function onTrackPointerMove(event) {
  if (event.pointerId !== state.scrubPointerId) return;
  if (
    !state.trackPointerMoved &&
    Math.abs(event.clientX - state.trackPointerStartX) >= 7
  ) {
    state.trackPointerMoved = true;
    elements.pageNavigator.classList.add("is-scrubbing");
    elements.openBook.classList.add("is-seeking");
  }
  if (!state.trackPointerMoved) return;
  updateScrubPosition(event.clientX);
}

function onTrackPointerEnd(event) {
  if (event.pointerId !== state.scrubPointerId) return;
  state.scrubPointerId = null;
  if (event.type === "pointercancel") {
    state.trackPointerMoved = false;
    elements.pageNavigator.classList.remove("is-scrubbing");
    elements.openBook.classList.remove("is-seeking");
    updateNavigator(state.currentIndex);
    elements.pageTrackInstruction.textContent = "滑动薄页 · 点击翻动厚页";
    return;
  }

  if (!state.trackPointerMoved) {
    const target = targetIndexFromClientX(event.clientX);
    updateNavigator(target);
    elements.openBook.classList.add("is-seeking");
    elements.pageTrackInstruction.textContent =
      `打开厚书页到第 ${indexLabel(target)} 页`;
    recordGuideProgressPractice("tap");
    void navigateToIndex(target, { interaction: "click" });
    return;
  }

  elements.pageNavigator.classList.remove("is-scrubbing");
  state.trackPointerMoved = false;
  recordGuideProgressPractice("drag");
  void navigateToIndex(state.scrubTargetIndex, { interaction: "drag" });
}

function onTrackKeyDown(event) {
  if (!state.isOpen || state.isAnimating) return;

  const keyTargets = {
    ArrowLeft: state.scrubTargetIndex - 1,
    ArrowDown: state.scrubTargetIndex - 1,
    ArrowRight: state.scrubTargetIndex + 1,
    ArrowUp: state.scrubTargetIndex + 1,
    PageDown: state.scrubTargetIndex - 10,
    PageUp: state.scrubTargetIndex + 10,
    Home: -1,
    End: state.answers.length - 1
  };

  if (!(event.key in keyTargets)) return;
  event.preventDefault();
  void navigateToIndex(keyTargets[event.key], { interaction: "drag" });
}

function openBook(openingMethod) {
  if (state.isOpen || elements.book.dataset.state === "closing") return;
  state.openingMethod = openingMethod;
  state.isOpen = true;
  resetFlip();
  setNavigatorVisible(false);

  const startingIndex = openingMethod === "swipe" ? -1 : randomIndex();
  showAnswer(startingIndex, { animate: false });

  elements.book.dataset.state = "opening";
  elements.openActions.hidden = false;
  elements.openActions.style.display = "flex";
  elements.openActions.classList.remove("is-visible");
  elements.statusText.hidden = true;

  if (openingMethod === "random") {
    elements.questionCopy.textContent = "你问过的问题，已经被这一页听见";
    elements.pageTrackInstruction.textContent =
      `从第 ${indexLabel(state.currentIndex)} 页开始 · 滑动书页`;
    elements.statusText.textContent = "轻触“再问一次”，可以重新抽取答案";
  } else {
    elements.questionCopy.textContent =
      "从第零页开始，把书页停在你真正想停下的位置";
    elements.pageTrackInstruction.textContent = "从 000 开始 · 滑动薄页";
    elements.statusText.textContent = "拖动会逐页翻动，轻点会打开一叠厚书页";
  }

  playOpenSound();
  advanceGuideAfterOpening();
  setTimeout(() => {
    if (state.isOpen) {
      elements.book.dataset.state = "open";
      setNavigatorVisible(true);
      elements.openActions.classList.add("is-visible");
      revealAnswer();
    }
  }, 900);
}

function closeBook() {
  if (!state.isOpen) return;
  state.isOpen = false;
  state.openingMethod = null;
  state.navigationToken += 1;
  state.openPointerId = null;
  state.openPointerDirection = 0;
  state.suppressOpenClick = false;
  state.scrubPointerId = null;
  state.trackPointerMoved = false;
  state.isAnimating = false;
  resetFlip();
  resetThickBlock();
  elements.book.dataset.state = "closing";
  elements.openBook.classList.remove("is-seeking", "is-page-swipe-ready");
  elements.pageNavigator.classList.remove("is-scrubbing", "is-turning");
  setNavigatorVisible(false);
  elements.pageTrackInstruction.textContent = "打开书后可滑动或轻点";
  elements.openActions.classList.remove("is-visible");
  elements.statusText.hidden = true;
  elements.statusText.textContent = "轻触随机开启 · 向左滑动从 000 开始";
  playCloseSound();

  setTimeout(() => {
    if (state.isOpen || elements.book.dataset.state !== "closing") return;
    elements.book.dataset.state = "closed";
    elements.openActions.hidden = true;
    elements.openActions.style.display = "";
    elements.statusText.hidden = false;
    if (state.guideActive) showGuideStep(0);
  }, 720);
}

async function turnOnePage(direction) {
  void navigateToIndex(state.currentIndex + direction, { interaction: "drag" });
}

function onOpenBookPointerDown(event) {
  if (
    !state.isOpen ||
    state.isAnimating ||
    elements.book.dataset.state !== "open" ||
    state.openPointerId !== null
  ) {
    return;
  }

  const rect = elements.openBook.getBoundingClientRect();
  state.openPointerId = event.pointerId;
  state.openPointerStartX = event.clientX;
  state.openPointerStartY = event.clientY;
  state.openPointerDirection =
    event.clientX < rect.left + rect.width / 2 ? -1 : 1;
  elements.book.setPointerCapture(event.pointerId);
}

function onOpenBookPointerMove(event) {
  if (event.pointerId !== state.openPointerId) return;
  const deltaX = event.clientX - state.openPointerStartX;
  const deltaY = event.clientY - state.openPointerStartY;
  const isHorizontalSwipe =
    Math.abs(deltaX) >= 18 &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

  elements.openBook.classList.toggle("is-page-swipe-ready", isHorizontalSwipe);
  if (isHorizontalSwipe && event.cancelable) event.preventDefault();
}

function resetOpenBookPointer() {
  state.openPointerId = null;
  state.openPointerDirection = 0;
  elements.openBook.classList.remove("is-page-swipe-ready");
}

function onOpenBookPointerEnd(event) {
  if (event.pointerId !== state.openPointerId) return;
  const deltaX = event.clientX - state.openPointerStartX;
  const deltaY = event.clientY - state.openPointerStartY;
  const direction = state.openPointerDirection;
  const shouldTurnPage =
    event.type !== "pointercancel" &&
    Math.abs(deltaX) >= 38 &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

  if (shouldTurnPage) {
    state.suppressOpenClick = true;
    setTimeout(() => {
      state.suppressOpenClick = false;
    }, 500);
    resetOpenBookPointer();
    advanceGuideAfterPageTurn();
    void turnOnePage(direction);
    return;
  }

  resetOpenBookPointer();
}

function onCoverPointerDown(event) {
  if (state.isOpen || state.coverPointerId !== null) return;
  state.coverPointerId = event.pointerId;
  state.coverPointerStartX = event.clientX;
  state.coverPointerStartY = event.clientY;
  state.coverPointerMoved = false;
  elements.coverButton.setPointerCapture(event.pointerId);
}

function onCoverPointerMove(event) {
  if (event.pointerId !== state.coverPointerId) return;
  const deltaX = event.clientX - state.coverPointerStartX;
  const deltaY = event.clientY - state.coverPointerStartY;
  if (Math.hypot(deltaX, deltaY) >= 8) {
    state.coverPointerMoved = true;
  }
  const isLeftSwipe =
    deltaX <= -28 &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
  elements.coverButton.classList.toggle("is-swipe-ready", isLeftSwipe);
}

function resetCoverPointer() {
  state.coverPointerId = null;
  state.coverPointerMoved = false;
  elements.coverButton.classList.remove("is-swipe-ready");
}

function onCoverPointerEnd(event) {
  if (event.pointerId !== state.coverPointerId) return;
  const deltaX = event.clientX - state.coverPointerStartX;
  const deltaY = event.clientY - state.coverPointerStartY;
  const shouldOpenSwipeMode =
    event.type !== "pointercancel" &&
    deltaX <= -48 &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

  if (shouldOpenSwipeMode) {
    hideBrowseModeHint({ persist: !elements.browseModeHint.hidden });
    hideRandomModeHint({ persist: !elements.randomModeHint.hidden });
    if (
      !state.guideActive &&
      readGuideCompleted() &&
      !readBrowseGuideCompleted()
    ) {
      startGuide();
    }
    state.suppressCoverClick = true;
    setTimeout(() => {
      state.suppressCoverClick = false;
    }, 500);
    resetCoverPointer();
    openBook("swipe");
    return;
  }

  resetCoverPointer();
}

function onCoverClick() {
  if (state.suppressCoverClick) {
    state.suppressCoverClick = false;
    return;
  }
  hideBrowseModeHint({ persist: !elements.browseModeHint.hidden });
  hideRandomModeHint({ persist: !elements.randomModeHint.hidden });
  openBook("random");
}

function onOpenBookClick(event) {
  if (state.suppressOpenClick) {
    state.suppressOpenClick = false;
    return;
  }
  if (
    !state.isOpen ||
    state.isAnimating ||
    elements.book.dataset.state !== "open"
  ) {
    return;
  }
  event.preventDefault();
  if (state.guideActive && state.guideStep === 2) {
    if (!state.guidePracticeReadyToClose) {
      elements.guideCopy.textContent = usesCoarsePointer()
        ? "先在进度条上完成一次滑动和一次轻触。"
        : "先在进度条上完成一次拖动和一次点击。";
      return;
    }
    if (state.guidePath === "quick") {
      elements.guideCuePrimary.classList.add("is-complete");
    } else {
      elements.guideCueSecondary.classList.add("is-complete");
    }
    const completedPath = state.guidePath;
    closeBook();
    if (completedPath === "quick") {
      completeGuide({ replayDelay: 6200 });
      setTimeout(showBrowseModeHint, 820);
    } else {
      completeGuide({ replayDelay: 6200 });
      setTimeout(showRandomModeHint, 820);
    }
    return;
  }
  closeBook();
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

function playBlockSound(depth) {
  const weight = Math.min(1, depth / 34);
  playTone({
    frequency: 115 + weight * 25,
    duration: 0.42,
    gain: 0.025 + weight * 0.012,
    type: "triangle"
  });
  playTone({
    frequency: 185 + weight * 30,
    duration: 0.3,
    gain: 0.012,
    type: "sine",
    delay: 0.16
  });
}

function vibrate(duration) {
  if ("vibrate" in navigator) navigator.vibrate(duration);
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundButton.setAttribute(
    "aria-label",
    state.soundEnabled ? "关闭声音" : "开启声音"
  );
  elements.soundLabel.textContent = state.soundEnabled ? "声音开" : "声音关";
  if (state.soundEnabled) playTapSound();
}

function showError(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.hidden = false;
}

async function init() {
  try {
    applyTheme(readStoredTheme());
    const response = await fetch("/data/aqi-answer-book.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`答案数据加载失败（${response.status}）`);
    const answerBook = await response.json();
    if (!Array.isArray(answerBook.answers) || answerBook.answers.length === 0) {
      throw new Error("答案数据为空");
    }
    state.answers = answerBook.answers;
    updateNavigator(-1);
    setNavigatorVisible(false);

    elements.coverButton.addEventListener("pointerdown", onCoverPointerDown);
    elements.coverButton.addEventListener("pointermove", onCoverPointerMove);
    elements.coverButton.addEventListener("pointerup", onCoverPointerEnd);
    elements.coverButton.addEventListener("pointercancel", onCoverPointerEnd);
    elements.coverButton.addEventListener("click", onCoverClick);
    elements.book.addEventListener("pointerdown", onOpenBookPointerDown);
    elements.book.addEventListener("pointermove", onOpenBookPointerMove);
    elements.book.addEventListener("pointerup", onOpenBookPointerEnd);
    elements.book.addEventListener("pointercancel", onOpenBookPointerEnd);
    elements.book.addEventListener("click", onOpenBookClick);
    elements.closeButton.addEventListener("click", closeBook);
    elements.guideButton.addEventListener("click", startGuide);
    elements.guideReplayHint.addEventListener("click", () => {
      hideGuideReplayHint();
      startGuide();
    });
    elements.guideSkip.addEventListener("click", () => completeGuide());
    elements.guideContinue.addEventListener("click", () => {
      if (state.guideStep === 1) {
        showGuideStep(2);
      }
    });
    elements.soundButton.addEventListener("click", toggleSound);
    elements.themeButton.addEventListener("click", toggleTheme);
    elements.againButton.addEventListener("click", () => {
      if (state.openingMethod === "random") {
        showAnswer(randomIndex());
      } else {
        void navigateToIndex(randomIndex(), { interaction: "click" });
      }
    });

    elements.pageTrack.addEventListener("pointerdown", onTrackPointerDown);
    elements.pageTrack.addEventListener("pointermove", onTrackPointerMove);
    elements.pageTrack.addEventListener("pointerup", onTrackPointerEnd);
    elements.pageTrack.addEventListener("pointercancel", onTrackPointerEnd);
    elements.pageTrack.addEventListener("keydown", onTrackKeyDown);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.guideActive) {
          completeGuide();
          return;
        }
        if (state.isOpen) closeBook();
      }
      if (state.isOpen) {
        if (event.key === "ArrowLeft") void turnOnePage(-1);
        if (event.key === "ArrowRight") void turnOnePage(1);
      }
    });
    window.addEventListener("resize", scheduleGuidePosition);

    setTimeout(() => elements.loadingScreen.classList.add("is-hidden"), 420);
    if (!readGuideCompleted()) {
      setTimeout(startGuide, 1080);
    } else if (!readGuideReplayHintSeen()) {
      setTimeout(showGuideReplayHint, 1080);
    }
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : "答案之书暂时无法打开");
    elements.loadingScreen.classList.add("is-hidden");
  }
}

init();
