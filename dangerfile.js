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
const gzipSize = require("gzip-size");

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

const buildAndComputeSize = async (folder) => {
  const esFile = await readBaseFile(`${folder}/es/highlight.min.js`);
  const commonJsFile = await readBaseFile(`${folder}/highlight.min.js`);
  return {
    es: await gzipSize(esFile),
    commonjs: await gzipSize(commonJsFile),
  };
};

const run = async () => {
  const base = await buildAndComputeSize("build_base");
  const pr = await buildAndComputeSize("build");

  if (base.commonjs === pr.commonjs && base.es === pr.es) {
    markdown(`**No Build Size Change**`);
    return;
  }

  markdown(`## Build Size Changes (gzip)

### highlight.min.js

| file | main | PR | diff | 
| --- | --- | --- | --- |
| highlight.min.js | ${formatBytes(base.commonjs)} | ${formatBytes(
    pr.commonjs
  )} | ${formatBytes(pr.commonjs - base.commonjs)}
| es/highlight.min.js | ${formatBytes(base.es)} | ${formatBytes(
    pr.es
  )} | ${formatBytes(pr.es - base.es)}

`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
