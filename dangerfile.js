/*
 * Adapted from prism: https://github.com/PrismJS/prism
 * Their license:
 *
 * MIT LICENSE
 *
 * Copyright (c) 2012 Lea Verou
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const { markdown } = require("danger");
const fs = require("fs").promises;
const { join } = require("path");
const gzipSize = require("gzip-size");

const PR_BUILD_DIR = "builds/pr";
const BASE_BUILD_DIR = "builds/base";

/**
 * Returns the contents of a text file in the base of the PR.
 *
 * The base is usually highlightjs/highlight.js/main
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
function readBaseFile(path) {
  return fs.readFile(path, "utf-8");
}

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const fileSize = async (file) => {
  const fileContents = await readBaseFile(file);
  return await gzipSize(fileContents);
};

const baseFile = (file) => {
  return join(BASE_BUILD_DIR, file);
};

/**
 * A file from the build directory of the PR.
 */
const prFile = (file) => {
  return join(PR_BUILD_DIR, file);
};

const run = async () => {
  const baseCommonjs = await fileSize(baseFile("highlight.min.js"));
  const baseEs = await fileSize(baseFile("es/highlight.min.js"));
  const prCommonjs = await fileSize(prFile("highlight.min.js"));
  const prEs = await fileSize(prFile("es/highlight.min.js"));

  if (baseCommonjs === prCommonjs && baseEs === prEs) {
    markdown(`## No CDN Build Size Changes

Checked highlight.min.js and es/highlight.min.js
`);
    return;
  }

  markdown(`## CDN Build Size Changes (gzip)

| file | main | PR | change | 
| --- | --- | --- | --- |
| highlight.min.js | ${formatBytes(baseCommonjs)} | ${formatBytes(
    prCommonjs
  )} | ${formatBytes(prCommonjs - baseCommonjs)}
| es/highlight.min.js | ${formatBytes(baseEs)} | ${formatBytes(
    prEs
  )} | ${formatBytes(prEs - baseEs)}

`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
