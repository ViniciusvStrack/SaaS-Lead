import { readFile, writeFile } from "node:fs/promises";

const cases = JSON.parse(await readFile(new URL("./cases/horizontal.json", import.meta.url), "utf8"));
const failures = cases.filter((item) => !item.id || !Array.isArray(item.messages) || !item.expected || Object.keys(item.expected).length === 0).map((item) => ({ id: item.id ?? "unknown", reason: "invalid eval fixture" }));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "dataset-validation-only",
  cases: cases.length,
  failures,
  note: "No accuracy claim is produced until a configured model is run against this versioned dataset.",
};
await writeFile(new URL("./report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`conversation-analysis eval dataset: ${cases.length} cases, ${failures.length} fixture failures`);
if (failures.length) process.exitCode = 1;
