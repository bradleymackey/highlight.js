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
const git = require("simple-git").gitP(__dirname);
const util = require("util");
const exec = util.promisify(require("child_process").exec);

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
/**
 * Returns the contents of a text file in the pull request branch.
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
function readPRFile(path) {
  return git.show([`pr:${path}`]);
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

const getBaseBuildSizes = async () => {
  await git.checkout("base");
  await exec("npm run build-cdn");
  const esFile = await readBaseFile("build/es/highlight.min.js");
  const commonJsFile = await readBaseFile("build/highlight.min.js");
  return {
    es: await gzipSize(esFile),
    commonjs: await gzipSize(commonJsFile),
  };
};

const getPRBuildSizes = async () => {
  await git.checkout("pr");
  await exec("npm run build-cdn");
  const esFile = await readBaseFile("build/es/highlight.min.js");
  const commonJsFile = await readBaseFile("build/highlight.min.js");
  return {
    es: await gzipSize(esFile),
    commonjs: await gzipSize(commonJsFile),
  };
};

const run = async () => {
  const base = await getBaseBuildSizes();
  const pr = await getPRBuildSizes();

  if (base.commonjs === pr.commonjs && base.es === pr.es) {
    markdown(`**No Build Size Change**`);
    return;
  }

  markdown(`## Build Size Changes (gzip)

### highlight.min.js

| main | PR |
| --- | --- |
${formatBytes(base.commonjs)} | ${formatBytes(pr.commonjs)}

### es/highlight.min.js

| main | PR |
| --- | --- |
${formatBytes(base.es)} | ${formatBytes(pr.es)}
`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
