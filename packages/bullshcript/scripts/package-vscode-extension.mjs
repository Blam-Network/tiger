// Packs vscode-extension/ into an installable .vsix without vsce (no network, no deps).
// A .vsix is a zip with [Content_Types].xml, extension.vsixmanifest and extension/...
// Usage: node scripts/package-vscode-extension.mjs [--install]
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const extDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "vscode-extension"
);
const skipDirs = new Set(["dist", "node_modules"]);

const manifest = JSON.parse(readFileSync(join(extDir, "package.json"), "utf8"));
const { name, publisher, version } = manifest;
const outFile = join(extDir, "dist", `${name}-${version}.vsix`);

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const contentTypes = `<?xml version="1.0" encoding="utf-8"?>
<Types><Default Extension=".json" ContentType="application/json"/><Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>
`;

const vsixManifest = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${escapeXml(name)}" Version="${escapeXml(version)}" Publisher="${escapeXml(publisher)}"/>
    <DisplayName>${escapeXml(manifest.displayName ?? name)}</DisplayName>
    <Description xml:space="preserve">${escapeXml(manifest.description ?? "")}</Description>
    <Tags></Tags>
    <Categories>${escapeXml((manifest.categories ?? []).join(","))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${escapeXml(manifest.engines?.vscode ?? "*")}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace,ui"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
`;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return skipDirs.has(entry) ? [] : walk(full);
    }
    return [full];
  });

const entries = [
  { path: "[Content_Types].xml", data: Buffer.from(contentTypes) },
  { path: "extension.vsixmanifest", data: Buffer.from(vsixManifest) },
  ...walk(extDir)
    .sort()
    .map((file) => ({
      path: `extension/${relative(extDir, file).replaceAll("\\", "/")}`,
      data: readFileSync(file),
    })),
];

// MS-DOS timestamps: hours/minutes/2-second units and years-since-1980/
// month/day, packed as 5-6-5 bit fields.
const now = new Date();
const dosTime =
  now.getHours() * 2048 +
  now.getMinutes() * 32 +
  Math.floor(now.getSeconds() / 2);
const dosDate =
  (now.getFullYear() - 1980) * 512 + (now.getMonth() + 1) * 32 + now.getDate();

const localParts = [];
const centralParts = [];
let offset = 0;

for (const { path, data } of entries) {
  const nameBuf = Buffer.from(path, "utf8");
  const packed = deflateRawSync(data);
  const stored = packed.length >= data.length;
  const body = stored ? data : packed;
  const method = stored ? 0 : 8;
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // utf-8 names
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  localParts.push(local, nameBuf, body);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(offset, 42);
  centralParts.push(central, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}

const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, Buffer.concat([...localParts, ...centralParts, end]));
console.log(`wrote ${outFile} (${entries.length} entries)`);

if (process.argv.includes("--install")) {
  // `code` is code.cmd on Windows, so it needs a shell
  const result = spawnSync(`code --install-extension "${outFile}" --force`, {
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}
