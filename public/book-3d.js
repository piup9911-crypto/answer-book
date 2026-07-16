import * as THREE from "./vendor/three.module.min.js";

const PAGE_WIDTH = 3.55;
const PAGE_HEIGHT = 4.7;
const PAGE_SEGMENTS = 32;
const BLOCK_LEAVES = 9;

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value));

const easeInOut = (value) =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

function makePageEdgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#c8b58f");
  gradient.addColorStop(0.18, "#eee3cb");
  gradient.addColorStop(0.78, "#e3d5b8");
  gradient.addColorStop(1, "#bda77f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 1; y < canvas.height; y += 3) {
    const alpha = 0.08 + Math.random() * 0.12;
    context.fillStyle = `rgba(92, 65, 34, ${alpha})`;
    context.fillRect(0, y, canvas.width, Math.random() > 0.7 ? 2 : 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2.4);
  return texture;
}

function createRoundedPageShape(width, height, radius = 0.1) {
  const shape = new THREE.Shape();
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;

  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  return shape;
}

function createCoverGeometry() {
  const shape = createRoundedPageShape(
    PAGE_WIDTH + 0.18,
    PAGE_HEIGHT + 0.2,
    0.14
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.045,
    bevelThickness: 0.035,
    curveSegments: 8
  });
  geometry.center();
  return geometry;
}

function createLeafGeometry() {
  const geometry = new THREE.PlaneGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_SEGMENTS,
    4
  );
  geometry.translate(PAGE_WIDTH / 2, 0, 0);
  geometry.userData.basePositions = Float32Array.from(
    geometry.attributes.position.array
  );
  return geometry;
}

function createOpenPageGeometry(side, width = PAGE_WIDTH - 0.08) {
  const geometry = new THREE.PlaneGeometry(width, PAGE_HEIGHT - 0.08, 30, 12);
  const positions = geometry.attributes.position;
  const halfWidth = width / 2;
  const halfHeight = (PAGE_HEIGHT - 0.08) / 2;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const distanceFromSpine =
      side === "left" ? (halfWidth - x) / width : (x + halfWidth) / width;
    const t = clamp(distanceFromSpine);
    const gutterDip = -0.2 * Math.exp(-t * 8.5);
    const pageArch = 0.24 * Math.pow(Math.sin(t * Math.PI), 0.78);
    const outerFall = -0.055 * Math.pow(t, 3);
    const verticalSoftness =
      0.025 *
      Math.cos((y / halfHeight) * Math.PI * 0.5) *
      Math.sin(t * Math.PI);
    positions.setZ(index, gutterDip + pageArch + outerFall + verticalSoftness);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function drawWrappedText(context, text, centerX, startY, maxWidth, lineHeight) {
  const characters = [...text];
  const lines = [];
  let line = "";

  for (const character of characters) {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  const totalHeight = (lines.length - 1) * lineHeight;
  lines.forEach((content, index) => {
    context.fillText(
      content,
      centerX,
      startY - totalHeight / 2 + index * lineHeight
    );
  });
}

function makePageTextTexture(renderer, side) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1400;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { canvas, context, texture, side };
}

function clearPageTexture(pageTexture) {
  const { canvas, context, texture } = pageTexture;
  context.clearRect(0, 0, canvas.width, canvas.height);
  texture.needsUpdate = true;
}

function drawLeftPageTexture(pageTexture, message) {
  const { canvas, context, texture } = pageTexture;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "#957541";
  context.font = '52px "Times New Roman", serif';
  context.fillText("✦", 520, 350);

  context.fillStyle = "#6b5e49";
  context.font = '500 58px "Noto Serif SC", "Songti SC", serif';
  context.fillText("把问题留在心里", 520, 520);

  context.fillStyle = "#8a7a61";
  context.font = '36px "Microsoft YaHei", sans-serif';
  drawWrappedText(context, message, 520, 675, 650, 62);

  context.strokeStyle = "rgba(151, 119, 68, 0.72)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(410, 820);
  context.lineTo(475, 820);
  context.moveTo(565, 820);
  context.lineTo(630, 820);
  context.stroke();
  context.fillStyle = "#957541";
  context.font = '22px "Times New Roman", serif';
  context.fillText("✦", 520, 820);

  context.textAlign = "left";
  context.fillStyle = "rgba(86, 67, 39, 0.56)";
  context.font = '24px "Times New Roman", serif';
  context.fillText("AQI", 80, 1305);
  texture.needsUpdate = true;
}

function drawAnswerTexture(pageTexture, answer) {
  const { canvas, context, texture } = pageTexture;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!answer) {
    texture.needsUpdate = true;
    return;
  }

  const label = String(answer.page || answer.id).padStart(3, "0");
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#28303a";
  const fontSize =
    answer.text.length > 16 ? 82 : answer.text.length > 9 ? 96 : 112;
  context.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
  drawWrappedText(context, answer.text, 500, 570, 700, fontSize * 1.55);

  context.strokeStyle = "rgba(157, 124, 73, 0.78)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(430, 800);
  context.lineTo(570, 800);
  context.stroke();

  context.fillStyle = "#8d7857";
  context.font = '25px "Times New Roman", serif';
  context.letterSpacing = "7px";
  context.fillText(`ANSWER · ${label}`, 500, 870);

  context.textAlign = "right";
  context.fillStyle = "rgba(86, 67, 39, 0.56)";
  context.font = '24px "Times New Roman", serif';
  context.fillText(label, 930, 1305);
  texture.needsUpdate = true;
}

class ThreeBook {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.pageRatio = 0;
    this.turnDirection = 1;
    this.turnProgress = 0;
    this.leafCount = 1;
    this.animationFrame = 0;
    this.running = false;
    this.isOpen = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: devicePixelRatio <= 1.75,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.camera.position.set(0, -0.48, 11.4);
    this.camera.lookAt(0, 0.12, 0);

    this.book = new THREE.Group();
    this.book.rotation.x = -0.105;
    this.scene.add(this.book);

    this.buildLights();
    this.buildBook();
    this.observeSize();
    this.render();
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xf8eed8, 0x172239, 0.82));

    const key = new THREE.DirectionalLight(0xffe6b6, 3.4);
    key.position.set(-4.8, 4.2, 7.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0004;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x7898c8, 5.4, 18, 2);
    rim.position.set(5.8, 1.8, 5.5);
    this.scene.add(rim);
  }

  buildBook() {
    const coverMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x142740,
      roughness: 0.76,
      metalness: 0.02,
      clearcoat: 0.16,
      clearcoatRoughness: 0.7
    });
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xeadfc8,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe1d3b5,
      map: makePageEdgeTexture(),
      roughness: 0.96
    });

    const coverGeometry = createCoverGeometry();
    this.leftCover = new THREE.Mesh(coverGeometry, coverMaterial);
    this.rightCover = new THREE.Mesh(coverGeometry, coverMaterial);
    this.leftCover.position.set(-PAGE_WIDTH / 2 - 0.035, 0, -0.33);
    this.rightCover.position.set(PAGE_WIDTH / 2 + 0.035, 0, -0.33);
    this.leftCover.castShadow = true;
    this.rightCover.castShadow = true;
    this.leftCover.receiveShadow = true;
    this.rightCover.receiveShadow = true;
    this.book.add(this.leftCover, this.rightCover);

    const stackGeometry = new THREE.BoxGeometry(
      PAGE_WIDTH - 0.1,
      PAGE_HEIGHT - 0.08,
      1
    );
    const stackFaceMaterial = paperMaterial.clone();
    const stackMaterials = [
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      stackFaceMaterial,
      stackFaceMaterial
    ];
    this.leftStack = new THREE.Mesh(stackGeometry, stackMaterials);
    this.rightStack = new THREE.Mesh(stackGeometry, stackMaterials);
    this.leftStack.position.x = -PAGE_WIDTH / 2;
    this.rightStack.position.x = PAGE_WIDTH / 2;
    this.leftStack.castShadow = true;
    this.rightStack.castShadow = true;
    this.leftStack.receiveShadow = true;
    this.rightStack.receiveShadow = true;
    this.book.add(this.leftStack, this.rightStack);

    const leftTopGeometry = createOpenPageGeometry("left");
    const rightTopGeometry = createOpenPageGeometry("right");
    this.leftTop = new THREE.Mesh(leftTopGeometry, paperMaterial);
    this.rightTop = new THREE.Mesh(rightTopGeometry, paperMaterial.clone());
    this.leftTop.position.x = -PAGE_WIDTH / 2;
    this.rightTop.position.x = PAGE_WIDTH / 2;
    this.leftTop.castShadow = true;
    this.rightTop.castShadow = true;
    this.leftTop.receiveShadow = true;
    this.rightTop.receiveShadow = true;
    this.book.add(this.leftTop, this.rightTop);

    this.leftTextTexture = makePageTextTexture(this.renderer, "left");
    this.rightTextTexture = makePageTextTexture(this.renderer, "right");
    const makeTextMaterial = (map) =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false
      });
    this.leftText = new THREE.Mesh(
      leftTopGeometry.clone(),
      makeTextMaterial(this.leftTextTexture.texture)
    );
    this.rightText = new THREE.Mesh(
      rightTopGeometry.clone(),
      makeTextMaterial(this.rightTextTexture.texture)
    );
    this.leftText.position.set(-PAGE_WIDTH / 2, 0, 0.012);
    this.rightText.position.set(PAGE_WIDTH / 2, 0, 0.012);
    this.leftText.renderOrder = 3;
    this.rightText.renderOrder = 3;
    this.book.add(this.leftText, this.rightText);
    drawLeftPageTexture(
      this.leftTextTexture,
      "然后相信你翻到的这一页"
    );
    clearPageTexture(this.rightTextTexture);

    const gutterCanvas = document.createElement("canvas");
    gutterCanvas.width = 256;
    gutterCanvas.height = 16;
    const gutterContext = gutterCanvas.getContext("2d");
    const gutterGradient = gutterContext.createLinearGradient(0, 0, 256, 0);
    gutterGradient.addColorStop(0, "rgba(40, 27, 14, 0)");
    gutterGradient.addColorStop(0.5, "rgba(30, 20, 10, 0.58)");
    gutterGradient.addColorStop(1, "rgba(40, 27, 14, 0)");
    gutterContext.fillStyle = gutterGradient;
    gutterContext.fillRect(0, 0, 256, 16);
    const gutterTexture = new THREE.CanvasTexture(gutterCanvas);
    const gutterMaterial = new THREE.MeshBasicMaterial({
      map: gutterTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    });
    this.gutterShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, PAGE_HEIGHT - 0.12),
      gutterMaterial
    );
    this.gutterShadow.position.set(0, 0, 0.018);
    this.gutterShadow.renderOrder = 4;
    this.book.add(this.gutterShadow);

    const spineGeometry = new THREE.CylinderGeometry(
      0.14,
      0.19,
      PAGE_HEIGHT + 0.1,
      18
    );
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: 0x172944,
      roughness: 0.82
    });
    this.spine = new THREE.Mesh(spineGeometry, spineMaterial);
    this.spine.position.set(0, 0, -0.25);
    this.spine.castShadow = true;
    this.book.add(this.spine);

    this.leaves = Array.from({ length: BLOCK_LEAVES }, (_, index) => {
      const material = paperMaterial.clone();
      material.color.offsetHSL(0, 0, (index % 3) * -0.012);
      const leaf = new THREE.Mesh(createLeafGeometry(), material);
      leaf.visible = false;
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      leaf.renderOrder = 5 + index;
      this.book.add(leaf);
      return leaf;
    });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 5.8),
      new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: 0.24,
        transparent: true
      })
    );
    shadow.position.z = -0.47;
    shadow.receiveShadow = true;
    this.book.add(shadow);

    this.setPageRatio(0);
    this.book.visible = false;
  }

  observeSize() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = Math.min(
      devicePixelRatio || 1,
      innerWidth < 700 ? 1.35 : 1.7
    );
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.position.z = this.camera.aspect < 1.35 ? 12.6 : 11.35;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  setPageRatio(ratio) {
    this.pageRatio = clamp(ratio);
    const leftDepth = 0.1 + this.pageRatio * 0.34;
    const rightDepth = 0.1 + (1 - this.pageRatio) * 0.34;
    this.setStackDepth(this.leftStack, this.leftTop, leftDepth);
    this.setStackDepth(this.rightStack, this.rightTop, rightDepth);
    this.render();
  }

  setStackDepth(stack, top, depth) {
    stack.scale.z = depth;
    stack.position.z = -0.12 - depth / 2;
    top.position.z = -0.045 + depth * 0.025;
    if (top === this.leftTop) {
      this.leftText.position.z = top.position.z + 0.012;
    } else {
      this.rightText.position.z = top.position.z + 0.012;
    }
    this.gutterShadow.position.z =
      Math.min(this.leftTop.position.z, this.rightTop.position.z) + 0.025;
  }

  setLeftPage(message) {
    drawLeftPageTexture(this.leftTextTexture, message);
    this.render();
  }

  setAnswer(answer, { visible = true } = {}) {
    drawAnswerTexture(this.rightTextTexture, answer);
    this.rightText.material.opacity = visible ? 1 : 0;
    this.render();
  }

  hideAnswer() {
    this.rightText.material.opacity = 0;
    this.render();
  }

  revealAnswer(duration = 700) {
    const startingOpacity = this.rightText.material.opacity;
    void this.animateValue({
      duration: this.reducedMotion ? 1 : duration,
      update: (progress) => {
        const eased = 1 - Math.pow(1 - progress, 3);
        this.rightText.material.opacity =
          startingOpacity + (1 - startingOpacity) * eased;
      }
    });
  }

  open() {
    this.isOpen = true;
    this.book.visible = true;
    this.book.scale.setScalar(0.82);
    this.book.rotation.z = -0.018;
    void this.animateValue({
      duration: this.reducedMotion ? 1 : 760,
      update: (progress) => {
        const eased = 1 - Math.pow(1 - progress, 3);
        this.book.scale.setScalar(0.82 + eased * 0.18);
        this.book.rotation.z = -0.018 * (1 - eased);
      }
    });
  }

  close() {
    this.isOpen = false;
    this.resetLeaf();
    this.book.visible = false;
    this.render();
  }

  beginLeaf(direction, count = 1) {
    this.turnDirection = direction;
    this.leafCount = Math.max(1, Math.min(BLOCK_LEAVES, count));
    this.leaves.forEach((leaf, index) => {
      leaf.visible = index < this.leafCount;
      leaf.position.z = 0.03 + index * 0.012;
    });
    this.setLeafProgress(0, direction, this.leafCount);
  }

  setLeafProgress(
    progress,
    direction = this.turnDirection,
    count = this.leafCount
  ) {
    this.turnDirection = direction;
    this.turnProgress = clamp(progress);
    const visibleCount = Math.max(1, Math.min(BLOCK_LEAVES, count || 1));

    this.leaves.forEach((leaf, index) => {
      if (index >= visibleCount) {
        leaf.visible = false;
        return;
      }
      leaf.visible = true;
      const delay = visibleCount === 1 ? 0 : index * 0.038;
      const leafProgress = clamp((this.turnProgress - delay) / (1 - delay));
      this.deformLeaf(leaf, leafProgress, direction, index, visibleCount);
    });
    this.render();
  }

  deformLeaf(leaf, progress, direction, layerIndex, layerCount) {
    const positions = leaf.geometry.attributes.position;
    const base = leaf.geometry.userData.basePositions;
    const eased = easeInOut(progress);
    const startAngle = direction > 0 ? 0 : Math.PI;
    const endAngle = direction > 0 ? Math.PI : 0;
    const centralAngle = THREE.MathUtils.lerp(startAngle, endAngle, eased);
    const lift = Math.sin(progress * Math.PI);
    const lag = layerCount > 1 ? (layerIndex / layerCount) * 0.12 : 0;

    for (let index = 0; index < positions.count; index += 1) {
      const baseIndex = index * 3;
      const originalX = base[baseIndex];
      const originalY = base[baseIndex + 1];
      const normalizedX = clamp(originalX / PAGE_WIDTH);
      const edgeCurl = Math.sin(normalizedX * Math.PI);
      const trailingCurl = Math.pow(normalizedX, 1.7);
      const bend =
        lift * ((normalizedX - 0.42) * 0.82 + edgeCurl * 0.22 - lag);
      const angle = centralAngle + (direction > 0 ? 1 : -1) * bend;
      const arch =
        lift *
        (0.18 + edgeCurl * 0.34 + trailingCurl * 0.12) *
        (1 - layerIndex * 0.025);
      const cornerFlutter =
        lift *
        Math.pow(normalizedX, 2.4) *
        Math.abs(originalY / (PAGE_HEIGHT / 2)) *
        0.06;

      positions.setXYZ(
        index,
        originalX * Math.cos(angle),
        originalY + cornerFlutter,
        Math.abs(originalX * Math.sin(angle)) * 0.62 +
          arch +
          layerIndex * 0.012
      );
    }

    positions.needsUpdate = true;
    leaf.geometry.computeVertexNormals();
  }

  animateLeaf(direction, duration) {
    this.beginLeaf(direction, 1);
    return this.animateValue({
      duration: this.reducedMotion ? 1 : duration,
      update: (progress) => this.setLeafProgress(progress, direction, 1)
    });
  }

  animateBlock(direction, distanceRatio, duration) {
    const count = Math.max(
      5,
      Math.min(BLOCK_LEAVES, Math.round(5 + distanceRatio * 4))
    );
    this.beginLeaf(direction, count);
    return this.animateValue({
      duration: this.reducedMotion ? 1 : duration,
      update: (progress) => {
        this.setLeafProgress(progress, direction, count);
        const weight = Math.sin(progress * Math.PI);
        this.book.rotation.x = -0.105 - weight * 0.022;
        this.book.position.y = -weight * 0.035;
      }
    }).finally(() => {
      this.book.rotation.x = -0.105;
      this.book.position.y = 0;
      this.resetLeaf();
    });
  }

  resetLeaf() {
    this.leaves?.forEach((leaf) => {
      leaf.visible = false;
    });
    this.turnProgress = 0;
    this.render();
  }

  animateValue({ duration, update }) {
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const progress =
          duration <= 1 ? 1 : clamp((now - startedAt) / duration);
        update(progress);
        this.render();
        if (progress < 1 && this.isOpen) {
          requestAnimationFrame(tick);
        } else {
          update(1);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    const frame = () => {
      if (!this.running) return;
      this.render();
      this.animationFrame = requestAnimationFrame(frame);
    };
    frame();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export function createThreeBook(canvas) {
  if (!canvas || !window.WebGL2RenderingContext) return null;
  try {
    return new ThreeBook(canvas);
  } catch (error) {
    console.warn("Three.js book renderer unavailable; keeping CSS fallback.", error);
    return null;
  }
}
