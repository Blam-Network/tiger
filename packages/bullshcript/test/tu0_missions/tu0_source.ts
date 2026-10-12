// The ScriptSource the TU0 mission tests hand the host.
import {
  type ActivityBundleTag,
  type CompiledScriptFiles,
  compileScriptFiles,
  fnv1,
  formatScriptTag,
  loadScriptFolder,
  type ScriptFile,
  type ScriptSource,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import {
  fukugenDaihonBuildDir,
  TU0_BUILD,
} from "../../tools/fukugen-daihon/folder.ts";

// Fukugen Daihon's TU0 folder, read once.
export const tu0Scripts = loadScriptFolder(fukugenDaihonBuildDir(TU0_BUILD));

let compiled: CompiledScriptFiles | undefined;

// The folder compiled once as one project.
export function tu0Compiled(): CompiledScriptFiles {
  compiled ??= compileScriptFiles(tu0Scripts.files);
  return compiled;
}

export function tu0ScriptSource(
  tags: readonly ActivityBundleTag[],
  destination: string
): ScriptSource {
  const files = new Map<string, { file: ScriptFile; refs: string[] }>();
  const idOf = (file: ScriptFile) => formatScriptTag(fnv1(file.path));
  for (const tag of tags) {
    const file = tu0Scripts.scriptByBundle(tag.bundle, destination);
    if (!file) {
      continue;
    }
    const refs: string[] = [];
    for (const mission of tu0Scripts.missionScripts(file)) {
      files.set(idOf(mission), { file: mission, refs: [] });
      refs.push(idOf(mission));
    }
    for (const row of tag.rows) {
      const archetype =
        row.childScript && tu0Scripts.archetypeScript(row.childScript);
      if (archetype) {
        files.set(idOf(archetype), { file: archetype, refs: [] });
        refs.push(idOf(archetype));
      }
    }
    files.set(formatScriptTag(tag.tag), { file, refs: [...new Set(refs)] });
  }
  return {
    read: (tagId) => {
      const entry = files.get(tagId);
      if (!entry) {
        return;
      }
      // the chunk padded to a word, then each referenced tag as a
      // big-endian word (scriptReferences reads every aligned word)
      const chunk = tu0Compiled().chunkFor(entry.file.path);
      const padded = Math.ceil(chunk.length / 4) * 4;
      const out = new Uint8Array(padded + entry.refs.length * 4);
      out.set(chunk);
      const view = new DataView(out.buffer);
      entry.refs.forEach((ref, i) => {
        view.setUint32(padded + i * 4, Number.parseInt(ref, 16));
      });
      return out;
    },
    schema: (tagId) => {
      const entry = files.get(tagId);
      return entry === undefined
        ? undefined
        : tu0Compiled().compiledDecl(entry.file.path).schema;
    },
    tags: () => [...files.keys()],
  };
}
