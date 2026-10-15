// The app's own reads of the game packages, with gibbon: an activity's slices
// (scenario_client bubbles and their states) and their spawn points, with
// names from the dictionary.
//
//   node scripts/data-service.mjs [--port N]   (0 or none: a free port)
//   GET /health
//   GET /slices?packages=<dir>&build=<build>&scenario=<hex>&dictionary=<dir>
//
// Prints `data-service listening on <port>` once up. The vite dev server
// mounts the same handler under /data (vite.config.ts).
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const BUILD = /^v[\w.]+$/;
const HEX = /^(0x)?[0-9a-f]{1,8}$/i;
const HASH_LINE = /^([0-9A-Fa-f]{8}),([^,]*)/;

const hex = (n) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;

// gibbon's ESM build pulls in cstruct's ESM build, whose extensionless
// imports Node can't resolve; its CommonJS build loads fine.
const gibbons = new Map();
function gibbon(build) {
  if (!BUILD.test(build)) {
    throw new Error(`bad build ${build}`);
  }
  let g = gibbons.get(build);
  if (!g) {
    g = require(`@blamnetwork/gibbon/destiny1/${build}`);
    gibbons.set(build, g);
  }
  return g;
}

const packageSets = new Map();
function packageSet(g, dir) {
  const key = `${dir}|${g.k_build_string ?? ""}`;
  let set = packageSets.get(key);
  if (!set) {
    set = g.c_package_set.open_directory(dir);
    packageSets.set(key, set);
  }
  return set;
}

// hash -> name from every domain CSV (`HASH,string,source,confidence`).
const dictionaries = new Map();
function dictionary(dir) {
  if (!dir) {
    return new Map();
  }
  let names = dictionaries.get(dir);
  if (names) {
    return names;
  }
  names = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".csv") || file === "conflicts.csv") {
      continue;
    }
    for (const line of readFileSync(path.join(dir, file), "utf8").split("\n")) {
      const match = line.match(HASH_LINE);
      if (match && !names.has(Number.parseInt(match[1], 16))) {
        names.set(Number.parseInt(match[1], 16), match[2].trim());
      }
    }
  }
  dictionaries.set(dir, names);
  return names;
}

// world hash -> world root, per package set. Builds without spawn point
// definitions (the alpha's gibbon) get none.
const worldsCache = new Map();
function worlds(g, set) {
  let found = worldsCache.get(set);
  if (!found) {
    found = g.find_worlds ? g.find_worlds(set) : new Map();
    worldsCache.set(set, found);
  }
  return found;
}

// A world bubble's spawn points, one per name: the first point's position
// and how many share the name. `default` first, then by name.
const spawnPointsCache = new Map();
function spawnPoints({ g, key, names, read, set }, world, bubbleIndex) {
  const root = world === undefined ? undefined : read(world, g.s_world).bubbles[bubbleIndex];
  if (!root) {
    return [];
  }
  const cached = spawnPointsCache.get(`${key}|${root.tag}`);
  if (cached) {
    return cached;
  }
  const byHash = new Map();
  for (const tag of g.find_world_bubble_spawn_point_sets(set, root.tag)) {
    for (const point of read(tag, g.s_spawn_point_set).points) {
      const hash = point.name_hash >>> 0;
      const seen = byHash.get(hash);
      if (seen) {
        seen.count++;
        continue;
      }
      const [x, y, z] = point.position.map((n) => Math.round(n * 100) / 100);
      byHash.set(hash, { count: 1, hash: hex(hash), name: names.get(hash) ?? hex(hash), position: [x, y, z] });
    }
  }
  const rank = (p) => {
    if (p.name === "default") {
      return 0;
    }
    return p.name.startsWith("0x") ? 2 : 1;
  };
  const points = [...byHash.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  spawnPointsCache.set(`${key}|${root.tag}`, points);
  return points;
}

const slicesCache = new Map();

// Every bubble state of the scenario: state 0 is the bubble's own, a later
// one a phase's (its unknown04 is fnv1 of the phase's name). A state's spawn
// points are its bubble's, from the world the descriptor names.
export function readSlices({ build, dictionary: dictionaryDir, packages, scenario }) {
  if (!(packages && build && scenario && HEX.test(scenario))) {
    throw new Error("slices needs packages, build and scenario (hex)");
  }
  const scenarioTag = Number.parseInt(scenario.replace(/^0x/i, ""), 16) >>> 0;
  const key = `${packages}|${build}|${scenarioTag}`;
  const cached = slicesCache.get(key);
  if (cached) {
    return cached;
  }
  const g = gibbon(build);
  const set = packageSet(g, packages);
  const read = (tag, definition) => g.read_definition(set.read_tag(tag), definition);
  const names = dictionary(dictionaryDir);
  const client = read(scenarioTag, g.s_scenario_client);
  const worldRoots = worlds(g, set);
  const slices = [];
  client.bubbles.forEach((bubble, index) => {
    bubble.states.forEach((state, stateIndex) => {
      const descriptor = read(state.descriptor, g.s_slice_descriptor);
      const blueprints = read(descriptor.blueprint_set, g.s_client_blueprint_set);
      const bundles = (list) => list.map(({ tag }) => hex(tag));
      const regionName = names.get(state.region_name_hash >>> 0);
      const slice = {
        bubble: index,
        bundles: {
          authoritative: bundles(blueprints.authoritative_bundles),
          global: bundles(blueprints.global_bundles),
          private: bundles(blueprints.private_bundles),
        },
        handle: `${index}.${stateIndex}`,
        public: state.mode !== 0,
        region: regionName ?? hex(state.region_name_hash),
        regionHash: hex(state.region_name_hash),
        spawnPoints: spawnPoints(
          { g, key: `${packages}|${build}|${dictionaryDir ?? ""}`, names, read, set },
          worldRoots.get((descriptor.world_hash ?? descriptor.unknown08) >>> 0),
          descriptor.bubble_index
        ),
        state: stateIndex,
      };
      if (regionName) {
        slice.regionName = regionName;
      }
      if (stateIndex > 0) {
        slice.phaseHash = hex(state.unknown04);
        const phase = names.get(state.unknown04 >>> 0);
        if (phase) {
          slice.phase = phase;
        }
      }
      slices.push(slice);
    });
  });
  slicesCache.set(key, slices);
  return slices;
}

// (req, res) for /health and /slices; anything else is a 404.
export function handleData(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.setHeader("access-control-allow-origin", "*");
    res.end(JSON.stringify(body));
  };
  try {
    switch (url.pathname) {
      case "/health":
        send(200, { ok: true });
        return;
      case "/slices":
        send(200, {
          slices: readSlices({
            build: url.searchParams.get("build"),
            dictionary: url.searchParams.get("dictionary"),
            packages: url.searchParams.get("packages"),
            scenario: url.searchParams.get("scenario"),
          }),
        });
        return;
      default:
        send(404, { error: `no ${url.pathname}` });
    }
  } catch (error) {
    send(500, { error: error instanceof Error ? error.message : String(error) });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--port");
  const port = at >= 0 ? Number(process.argv[at + 1]) : 0;
  const server = createServer(handleData);
  server.listen(port, "127.0.0.1", () => {
    console.log(`data-service listening on ${server.address().port}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
