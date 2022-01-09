const path = require('path');

const compareVersion = require('compare-versions');
const fs = require('fs-extra');
const git = require('simple-git/promise');

const MIN_VERSION = '0.8.1';
const PROTOC_GEN_TS = 'protoc-gen-ts';
const PROTOC_GEN_TS_REPO = 'https://github.com/thesayyn/protoc-gen-ts.git';
const PROTOC_GEN_TS_DIR = path.join(__dirname, '..', PROTOC_GEN_TS);

(async () => {
  const cloned = await fs.pathExists(PROTOC_GEN_TS_DIR);
  if (!cloned) {
    await git().clone(PROTOC_GEN_TS_REPO);
  }
  const remoteTags = await getTags(PROTOC_GEN_TS_DIR);
  const localTags = await getTags(__dirname);
  const missingTags = getMissingTags(remoteTags, localTags);
  for (const tag of missingTags) {
    await git(PROTOC_GEN_TS_DIR).checkout(tag.ref);
    await yarnRun(__dirname, 'compile'); // yarn --cwd protoc-gen-ts && pkg .
    await yarnRun(__dirname, 'archive');
  }

  // TODO(dio): Create tags, release, and upload the artifacts.
})();

function parseTagPath(tagPath) {
  const parts = tagPath.split('/');
  return {
    type: parts[1],
    name: parts[2]
  };
}

async function yarnRun(dir, cmd) {
  const { execa } = await import('execa');
  return execa('yarn', ['--cwd', dir, 'run', cmd]);
}

async function getTags(dir) {
  const revisions = await git(dir).listRemote('--tags');
  const lines = revisions.split('\n').filter((line) => line !== '' && line.indexOf('refs/tags') >= 0);
  return lines.map((line) => {
    const parts = line.split('\t');
    return {
      ref: parts[0],
      ...parseTagPath(parts[1])
    };
  }).filter((tag) => compareVersion(tag.name, MIN_VERSION) >= 0);
}

function getMissingTags(remoteTags, localTags) {
  if (localTags.length === 0) {
    return remoteTags;
  }
  return remoteTags.filter((tag) => !includesTag(tag, localTags));
}

function includesTag(tag, tags) {
  return tags.filter((item) => item.name === tag.name).length > 0;
}
