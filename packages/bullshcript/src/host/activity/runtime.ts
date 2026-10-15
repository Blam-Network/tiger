import {
  loadScriptSchemas,
  type ScriptSource,
} from "../../hks/source/script_source.ts";
import { childScriptsFor, loadScriptGraph } from "../build/script_graph.ts";
import type { ActivityBundleTag } from "../tags/tag_types.ts";
import { EncounterScriptHost } from "./encounter_host.ts";
import type { EncounterScriptHostOptions } from "./host_context.ts";

export interface ScriptRuntimeOptions
  extends Omit<
    EncounterScriptHostOptions,
    "childScripts" | "chunkOwners" | "chunks" | "rootTags" | "rowOwners"
  > {
  // Items the scripts resolve names against: every bundle the activity
  // serves.
  bundles: readonly ActivityBundleTag[];
  // Bundles whose own scripts run. Defaults to `bundles`; narrow it to run
  // one bubble's scripts without starting every other bubble's.
  scriptBundles?: readonly ActivityBundleTag[];
  // The script tag (80800B48) a bundle's host tag names.
  scriptFor: (bundleTag: number) => number | undefined;
  scripts: ScriptSource;
}

export class ScriptRuntime extends EncounterScriptHost {
  // Tag ids of every script the runtime loaded, roots first.
  readonly scriptTags: readonly string[];

  constructor(options: ScriptRuntimeOptions) {
    const scriptBundles = options.scriptBundles ?? options.bundles;
    const graph = loadScriptGraph(
      options.scripts,
      options.scriptFor,
      scriptBundles
    );
    const childScripts = childScriptsFor(
      options.types,
      options.scripts,
      graph.chunks,
      options.bundles,
      scriptBundles,
      options.childScriptSchemaMap
    );
    super({
      ...options,
      childScripts,
      chunkOwners: graph.chunkOwners,
      chunks: graph.chunks,
      rootTags: graph.rootTags,
      rowOwners: graph.rowOwners,
      // the schemas the source compiled beside the graph's chunks
      schemas:
        options.schemas ??
        loadScriptSchemas(
          options.scripts,
          [...graph.chunks, ...childScripts.values()].map((c) => c.tagId)
        ),
    });
    this.scriptTags = graph.chunks.map((chunk) => chunk.tagId);
  }
}
