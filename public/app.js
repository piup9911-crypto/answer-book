const elements = {
  answerContent: document.querySelector("#answerContent"),
  answerNumber: document.querySelector("#answerNumber"),
  answerText: document.querySelector("#answerText"),
  blockBendSlices: [...document.querySelectorAll(".block-bend-slice")],
  blockLagPages: [...document.querySelectorAll(".block-lag-page")],
  book: document.querySelector("#book"),
  bookShadow: document.querySelector(".book-shadow"),
  closeButton: document.querySelector("#closeButton"),
  coverButton: document.querySelector("#coverButton"),
  errorToast: document.querySelector("#errorToast"),
  loadingScreen: document.querySelector("#loadingScreen"),
  modeCancel: document.querySelector("#modeCancel"),
  modePicker: document.querySelector("#modePicker"),
  openActions: document.querySelector("#openActions"),
  openBook: document.querySelector("#openBook"),
  pageNavigator: document.querySelector("#pageNavigator"),
  pageNumber: document.querySelector("#pageNumber"),
  pageTrack: document.querySelector("#pageTrack"),
  pageTrackFill: document.querySelector("#pageTrackFill"),
  pageTrackInstruction: document.querySelector("#pageTrackInstruction"),
  pageTrackPreview: document.querySelector("#pageTrackPreview"),
  pageTrackThumb: document.querySelector("#pageTrackThumb"),
  questionCopy: document.querySelector("#questionCopy"),
  randomMode: document.querySelector("#randomMode"),
  againButton: document.querySelector("#againButton"),
  soundButton: document.querySelector("#soundButton"),
  soundLabel: document.querySelector("#soundLabel"),
  statusText: document.querySelector("#statusText"),
  swipeMode: document.querySelector("#swipeMode"),
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
  currentIndex: 0,
  mode: null,
  modePickerOpen: false,
  flipDirection: 0,
  flipProgress: 0,
  flipTargetIndex: 0,
  isAnimating: false,
  isOpen: false,
  navigationToken: 0,
  scrubPointerId: null,
  scrubTargetIndex: 0,
  trackPointerStartX: 0,
  trackPointerMoved: false,
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
  updateBookThickness(state.currentIndex);

  if (animate) {
    elements.answerContent.classList.remove("answer-change");
    void elements.answerContent.offsetWidth;
    elements.answerContent.classList.add("answer-change");
  }
}

function updateBookThickness(index) {
  if (state.answers.length <= 1) return;
  const ratio = normalizedIndex(index) / (state.answers.length - 1);
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
  state.flipTargetIndex = normalizedIndex(targetIndex);
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
        offset: 0,
        easing: "cubic-bezier(0.32, 0, 0.64, 1)"
      },
      {
        transform:
          `rotateY(${sign * 58}deg) rotateZ(${sign * 0.7}deg) ` +
          "translateZ(9px) scaleX(0.992)",
        offset: 0.34,
        easing: "cubic-bezier(0.26, 0.02, 0.54, 1)"
      },
      {
        transform:
          `rotateY(${sign * 118}deg) rotateZ(${sign * -0.38}deg) ` +
          "translateZ(15px) scaleX(0.973)",
        offset: 0.67,
        easing: "cubic-bezier(0.3, 0, 0.48, 1)"
      },
      {
        transform:
          `rotateY(${sign * 184}deg) rotateZ(${sign * 0.18}deg) ` +
          "translateZ(5px) scaleX(0.992)",
        offset: 0.93,
        easing: "ease-out"
      },
      {
        transform:
          `rotateY(${sign * 180}deg) rotateZ(0deg) translateZ(2px) scaleX(1)`,
        offset: 1
      }
    ],
    {
      duration,
      fill: "forwards"
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
  await wait(32);
  await animatePreparedFlip(true, duration, { quiet });
}

function updateNavigator(index) {
  const boundedIndex = Math.max(0, Math.min(state.answers.length - 1, index));
  const percent =
    state.answers.length <= 1
      ? 0
      : (boundedIndex / (state.answers.length - 1)) * 100;
  const label = pageLabel(state.answers[boundedIndex]);

  elements.pageNavigator.style.setProperty("--page-position", `${percent}%`);
  elements.pageTrackPreview.textContent = label;
  elements.pageTrack.setAttribute("aria-valuenow", String(boundedIndex + 1));
  elements.pageTrack.setAttribute("aria-valuetext", `第 ${label} 页`);
  state.scrubTargetIndex = boundedIndex;
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
    `正在翻到第 ${pageLabel(state.answers[target])} 页`;
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
      intermediateIndex = normalizedIndex(state.currentIndex + direction);
    }

    const edgeSlowdown = step === 1 || step === flipCount ? 45 : 0;
    const duration = Math.max(105, 172 - flipCount * 3) + edgeSlowdown;

    await runAutomaticFlip(
      direction,
      intermediateIndex,
      duration,
      { quiet: step !== flipCount }
    );
    if (step !== flipCount) await wait(18);
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
  const uprightAngle = direction > 0 ? -88 : 88;
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
    `transform ${firstPhase}ms cubic-bezier(0.34, 0.02, 0.58, 1)`;
  elements.thickPageBlock.style.transform =
    `rotateY(${uprightAngle}deg) rotateZ(${direction * -0.35}deg) translateZ(12px)`;
  const liftLayerAnimations = animateBlockLayers(
    direction,
    firstPhase + 55,
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

  await wait(firstPhase + 55);
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
    `transform ${secondPhase}ms cubic-bezier(0.38, 0, 0.22, 1)`;
  elements.thickPageBlock.style.transform =
    `rotateY(${angle}deg) rotateZ(${direction * 0.12}deg) translateZ(4px)`;
  const settleLayerAnimations = animateBlockLayers(
    direction,
    secondPhase + 90,
    "settle"
  );
  const settleShadowAnimation = elements.bookShadow.animate(
    [
      { transform: "translate(-50%, -50%) scaleX(0.82)", opacity: 0.46 },
      { transform: "translate(-50%, -50%) scaleX(1.035)", opacity: 0.78, offset: 0.78 },
      { transform: "translate(-50%, -50%) scaleX(1)", opacity: 0.72 }
    ],
    {
      duration: secondPhase + 160,
      easing: "ease-out"
    }
  );

  await wait(secondPhase + 48);
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
    state.mode !== "swipe" ||
    state.isAnimating
  ) {
    return;
  }

  const target = Math.max(0, Math.min(state.answers.length - 1, targetIndex));
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
  return Math.round(ratio * (state.answers.length - 1));
}

function updateScrubPosition(clientX) {
  const target = targetIndexFromClientX(clientX);
  updateNavigator(target);
  elements.pageTrackInstruction.textContent =
    `松手后逐页翻到第 ${pageLabel(state.answers[target])} 页`;
}

function onTrackPointerDown(event) {
  if (
    state.mode !== "swipe" ||
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
      `打开厚书页到第 ${pageLabel(state.answers[target])} 页`;
    void navigateToIndex(target, { interaction: "click" });
    return;
  }

  elements.pageNavigator.classList.remove("is-scrubbing");
  state.trackPointerMoved = false;
  void navigateToIndex(state.scrubTargetIndex, { interaction: "drag" });
}

function onTrackKeyDown(event) {
  if (state.mode !== "swipe" || state.isAnimating) return;

  const keyTargets = {
    ArrowLeft: state.scrubTargetIndex - 1,
    ArrowDown: state.scrubTargetIndex - 1,
    ArrowRight: state.scrubTargetIndex + 1,
    ArrowUp: state.scrubTargetIndex + 1,
    PageDown: state.scrubTargetIndex - 10,
    PageUp: state.scrubTargetIndex + 10,
    Home: 0,
    End: state.answers.length - 1
  };

  if (!(event.key in keyTargets)) return;
  event.preventDefault();
  void navigateToIndex(keyTargets[event.key], { interaction: "drag" });
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
    elements.pageNavigator.classList.remove("is-visible");
    elements.pageNavigator.hidden = true;
    elements.statusText.textContent = "轻触“再问一次”，可以重新抽取答案";
  } else {
    elements.questionCopy.textContent = "滑动书下方的页数轨道，松手后等待书页停下";
    updateNavigator(state.currentIndex);
    elements.pageNavigator.hidden = false;
    requestAnimationFrame(() => {
      elements.pageNavigator.classList.add("is-visible");
    });
    elements.pageTrackInstruction.textContent = "滑动薄页 · 点击翻动厚页";
    elements.statusText.textContent = "拖动会逐页翻动，轻点会打开一叠厚书页";
  }

  playOpenSound();
  setTimeout(() => {
    if (state.isOpen) elements.book.dataset.state = "open";
  }, 900);
}

function closeBook() {
  state.isOpen = false;
  state.mode = null;
  state.navigationToken += 1;
  state.scrubPointerId = null;
  state.trackPointerMoved = false;
  state.isAnimating = false;
  resetFlip();
  resetThickBlock();
  elements.book.dataset.state = "closed";
  elements.openBook.setAttribute("aria-hidden", "true");
  elements.openBook.classList.remove("is-seeking");
  elements.pageNavigator.classList.remove("is-visible", "is-scrubbing", "is-turning");
  elements.pageNavigator.hidden = true;
  elements.openActions.hidden = true;
  elements.openActions.style.display = "";
  elements.statusText.hidden = false;
  elements.statusText.textContent = "先想好一个问题，再触碰书封";
  playCloseSound();
}

async function turnOnePage(direction) {
  void navigateToIndex(state.currentIndex + direction, { interaction: "drag" });
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
