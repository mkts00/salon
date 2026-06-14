import { access, copyFile, cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const entryFiles = ["index.html", "style.css", "script.js"];
const assetDirectories = ["assets"];

function normalizeLocalReference(reference) {
  const value = reference.trim();

  if (
    !value ||
    value.startsWith("#") ||
    /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(value)
  ) {
    return null;
  }

  const cleanPath = value.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  return cleanPath ? decodeURIComponent(cleanPath) : null;
}

function collectReferences(html, css) {
  const references = new Set();
  const htmlPattern = /(?:src|href)=["']([^"']+)["']/gi;
  const cssPattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

  for (const match of html.matchAll(htmlPattern)) {
    const reference = normalizeLocalReference(match[1]);
    if (reference) references.add(reference);
  }

  for (const match of css.matchAll(cssPattern)) {
    const reference = normalizeLocalReference(match[1]);
    if (reference) references.add(reference);
  }

  return references;
}

async function assertFileExists(relativePath) {
  const absolutePath = path.resolve(root, relativePath);

  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Invalid local reference outside project: ${relativePath}`);
  }

  await access(absolutePath);
  const info = await stat(absolutePath);

  if (!info.isFile()) {
    throw new Error(`Expected a file: ${relativePath}`);
  }
}

async function build() {
  const [html, css] = await Promise.all([
    readFile(path.join(root, "index.html"), "utf8"),
    readFile(path.join(root, "style.css"), "utf8"),
  ]);

  if (!html.includes('<meta name="viewport"')) {
    throw new Error("index.html is missing the responsive viewport meta tag.");
  }

  if (/https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(html)) {
    throw new Error("index.html contains a local development URL.");
  }

  const references = collectReferences(html, css);
  await Promise.all([...references].map(assertFileExists));

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  await Promise.all(
    entryFiles.map((file) =>
      copyFile(path.join(root, file), path.join(output, file))
    )
  );

  await Promise.all(
    assetDirectories.map((directory) =>
      cp(path.join(root, directory), path.join(output, directory), {
        recursive: true,
      })
    )
  );

  console.log(
    `Build complete: dist/ (${entryFiles.length} files, ${references.size} local references verified)`
  );
}

build().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
