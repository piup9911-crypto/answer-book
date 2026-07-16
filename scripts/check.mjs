import { readFile } from "node:fs/promises";

const requiredFiles = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/data/aqi-answer-book.json"
];

for (const file of requiredFiles) {
  await readFile(file);
}

const answerBook = JSON.parse(
  await readFile("public/data/aqi-answer-book.json", "utf8")
);

if (!Array.isArray(answerBook.answers) || answerBook.answers.length !== 412) {
  throw new Error("答案数据必须包含 412 条记录。");
}

const ids = new Set(answerBook.answers.map((answer) => answer.id));
if (ids.size !== answerBook.answers.length) {
  throw new Error("答案 ID 存在重复。");
}

for (const answer of answerBook.answers) {
  if (!answer.id || !answer.page || !answer.text?.trim()) {
    throw new Error(`答案记录不完整：${JSON.stringify(answer)}`);
  }
}

console.log(`检查通过：${answerBook.title}，共 ${answerBook.answers.length} 页。`);
