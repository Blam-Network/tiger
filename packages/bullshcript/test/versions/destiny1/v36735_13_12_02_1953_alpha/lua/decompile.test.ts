import { describe, expect, it } from "vitest";
import { compileBungieScript } from "../../../../../src/bungiescript/compile.ts";
import type { HksBytecode } from "../../../../../src/hks/bytecode/proto.ts";
import { readBytecode } from "../../../../../src/hks/bytecode/reader.ts";
import { compileLuaChunk } from "../../../../../src/hks/compiler/compile.ts";
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
        source: "squad sq\n\ndef f():\n\n    sq.place()\n",
      },
    ]);
    const chunk = readBytecode(result.decls[0].chunk as Uint8Array, "T");
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
    const code = (c: HksBytecode) =>
      [c.root, ...c.root.protos].map((p) => p.code.map((i) => i.raw));
    expect(code(again)).toEqual(code(chunk));
  });
});
