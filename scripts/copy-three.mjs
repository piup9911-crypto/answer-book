import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const files = [
  ["node_modules/three/build/three.module.min.js", "public/vendor/three.module.min.js"],
  ["node_modules/three/build/three.core.min.js", "public/vendor/three.core.min.js"]
];

for (const [source, target] of files) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log("Three.js browser modules ready.");
