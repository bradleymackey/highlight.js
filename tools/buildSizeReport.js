#!/usr/bin/env node

/*
 * Input: path to 2 build directories to compare.
 * Output: markdown report of size changes.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/**
 * The size, in bytes of the given file after gzip.
 */
function computedFile(dir, filePath) {
  const pathToFile = path.join(dir, filePath);
  const str = fs.readFileSync(pathToFile);
  return zlib.gzipSync(str).length;
}

/**
 * Returns mardown report of size differences.
 */
function run() {
  const [base, pr] = process.argv.slice(2);
  const files = ["highlight.min.js", "es/highlight.min.js"];

  let md = "# Build Size Report (gzip)\n\n";
  md += "| file | base | pr | diff |\n";
  md += "| --- | --- | --- | --- |\n";
  for (const file of files) {
    const computedBase = computedFile(base, file);
    const computedPR = computedFile(pr, file);
    const diff = computedPR - computedBase;
    const sign = diff >= 0 ? "+" : "-";
    md += `| ${file} | ${computedBase}B | ${computedPR}B | ${sign}${diff}B\n |`;
  }

  return md;
}

console.log(run());
