const fs = require("fs");
const path = require("path");
const { pkg } = require(path.join(__dirname, "..", "package.json"));

const tar = require("tar");
const zip = require("cross-zip");

const distDir = path.join(__dirname, "..", "dist");
const protocGenTs = "protoc-gen-ts";
const protocGenTsBinaries = "protoc-gen-ts-binaries";

// Create archives from protoc-gen-ts binaries.
(async () => {
  for (const target of pkg.targets) {
    const exe = target.indexOf("win") > 0 ? ".exe" : "";
    const prefix = target.split("-")[0] + "-";
    const suffix = target.substring(prefix.length);
    if (!fs.existsSync(path.join(distDir, `${protocGenTsBinaries}-${suffix}${exe}`))) {
      throw new Error(`binary for ${suffix} is missing`);
    }
    const currentBinary = path.join(distDir, `${protocGenTs}${exe}`);
    fs.renameSync(path.join(distDir, `${protocGenTsBinaries}-${suffix}${exe}`), currentBinary);
    if (exe) {
      zip.zipSync(currentBinary, path.join(distDir, `${protocGenTs}-${suffix}.zip`));
    } else {
      await tar.c({ file: path.join(distDir, `${protocGenTs}-${suffix}.tar.gz`), cwd: distDir }, [protocGenTs]);
    }
    fs.unlinkSync(currentBinary);
  }
})();
