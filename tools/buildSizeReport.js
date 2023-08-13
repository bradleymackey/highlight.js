#!/usr/bin/env node

/*
 * Input: path to 2 build directories to compare.
 * Output: markdown report of size changes.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const glob = require("glob");

/**
 * The size, in bytes, of the given file after gzip.
 */
function computedFile(dir, filePath) {
  const pathToFile = path.join(dir, filePath);
  const str = fs.readFileSync(pathToFile);
  return zlib.gzipSync(str).length;
}

/**
 * Returns list of minified files in the given directory.
 */
async function minifiedFiles(dir) {
  return await new Promise((res, rej) => {
    glob(dir + "/**/*.min.js", {}, (err, files) => {
      if (err) {
        rej(err);
      } else {
        res(files.map((f) => f.replace(dir + "/", "")));
      }
    });
  });
}

/**
 * Returns markdown report of size differences.
 */
async function run() {
  const [base, pr] = process.argv.slice(2);
  const baseFiles = await minifiedFiles(base);
  const prFiles = await minifiedFiles(pr);

  const baseFilesSet = new Set(baseFiles);
  const prFilesSet = new Set(prFiles);

  let addedFiles = [];
  for (const file of prFiles) {
    if (!baseFilesSet.has(file)) {
      addedFiles.push(file);
    }
  }

  let changedFiles = [];
  let removedFiles = [];
  for (const file of baseFiles) {
    if (prFilesSet.has(file)) {
      changedFiles.push(file);
    } else {
      removedFiles.push(file);
    }
  }

  let md = "# Build Size Report (gzip)\n\n";

  if (addedFiles.length > 0) {
    const maybeS = addedFiles.length === 1 ? "" : "s";
    md += `## ${addedFiles.length} Added File${maybeS}\n\n`;
    md += "<details>\n";
    md += "| file | size |\n";
    for (const file of addedFiles) {
      const computedSize = computedFile(pr, file);
      md += `| ${file} | +${computedSize}B |\n`;
    }
    md += "</details>\n";
    md += "\n";
  }

  if (removedFiles.length > 0) {
    const maybeS = removedFiles.length === 1 ? "" : "s";
    md += `## ${removedFiles.length} Removed File${maybeS}\n\n`;
    md += "<details>\n";
    md += "| file | size |\n";
    for (const file of removedFiles) {
      const computedSize = computedFile(base, file);
      md += `| ${file} | -${computedSize}B |\n`;
    }
    md += "</details>\n";
    md += "\n";
  }

  let fileSizeChanges = 0;
  let combinedChangeSize = 0;
  md += "## Changed Files\n\n";
  let sizeChangeMd = "| file | base | pr | diff |\n";
  sizeChangeMd += "| --- | --- | --- | --- |\n";
  for (const file of changedFiles) {
    const computedBase = computedFile(base, file);
    const computedPR = computedFile(pr, file);
    const diff = computedPR - computedBase;
    if (diff !== 0) {
      combinedChangeSize += diff;
      fileSizeChanges += 1;
      const sign = diff >= 0 ? "+" : "-";
      sizeChangeMd += `| ${file} | ${computedBase}B | ${computedPR}B | ${sign}${diff}B |\n`;
    }
    sizeChangeMd += "\n";
  }

  if (fileSizeChanges > 0) {
    const maybeS = fileSizeChanges === 1 ? "" : "s";
    const sign = combinedChangeSize >= 0 ? "+" : "-";
    md += `${fileSizeChanges} file${maybeS} changed, totalling ${sign}${combinedChangeSize}B\n`;
    md += "<details>\n";
    md += sizeChangeMd;
    md += "</details>\n";
    md += "\n";
  } else {
    md += "No existing build file changes.";
  }

  return md;
}

(async () => {
  console.log(await run());
})();
