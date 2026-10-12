import { describe, expect, it } from "vitest";
import { compileBungieScript } from "../../../../../src/bungiescript/compile.ts";
import { compileLuaChunk } from "../../../../../src/hks/compile.ts";
import type { LuaChunk } from "../../../../../src/hks/types.ts";
import { parseLuaChunk } from "../../../../../src/hks/undump.ts";
import { decompile } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/lua/decompile.ts";

// bs\weapons\weapon_types.bs, the smallest alpha chunk (8210002C), as the
// decompiler prints it.
const WEAPON_TYPES = `
local _M = {}
_M.decl_name = "weapon"
_M.definition = {}
_M.instance = {}
local print = print
local assert = assert
function _M.instance:foo()
  print("this sucks")
end
function _M.upvalue_provider()
  return {}
end
return _M
`;

describe("the decompiler on compiled chunks", () => {
  it("names a compiled method's source lines", () => {
    const result = compileBungieScript([
      {
        path: "es/utility_scripts/t.esu",
        source: "c_squad_sensor_host sq\n\ndef f():\n\n    sq.place()\n",
      },
    ]);
    const chunk = parseLuaChunk(result.decls[0].chunk as Uint8Array, "T");
    expect(decompile(chunk).source).toContain(
      "function _M.instance:f() -- lines 3-5"
    );
  });

  it("round-trips a compiled chunk through the compiler", () => {
    const chunk = compileLuaChunk(WEAPON_TYPES, {
      chunkName: "@bs\\weapons\\weapon_types.bs",
    });
    const again = compileLuaChunk(decompile(chunk).source, {
      chunkName: "@bs\\weapons\\weapon_types.bs",
    });
    const code = (c: LuaChunk) =>
      [c.root, ...c.root.protos].map((p) => p.code.map((i) => i.raw));
    expect(code(again)).toEqual(code(chunk));
  });
});
