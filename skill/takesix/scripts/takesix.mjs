#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// node_modules/@takesix/core/dist/constants.js
var SIZES = [
	"S",
	"M",
	"L",
	"F"
];
var LINK_DIRECTIONS = [
	"forward",
	"both",
	"none"
];
// node_modules/@takesix/core/dist/tree-index.js
/**
* Builds an id → position lookup for a document. On duplicate ids the first
* occurrence wins; {@link validateDocument} reports the duplicates.
*/
function buildIndex(doc) {
	const index = /* @__PURE__ */ new Map();
	const walk = (blocks, parentId, parentPath) => {
		for (const block of blocks) {
			if (index.has(block.id)) continue;
			const path = [...parentPath, block.id];
			index.set(block.id, {
				block,
				parentId,
				path,
				depth: parentPath.length
			});
			if (block.children?.length) walk(block.children, block.id, path);
		}
	};
	walk(doc.blocks, null, []);
	return index;
}
// node_modules/@takesix/core/dist/validate.js
var DOCUMENT_FIELDS = [
	"takesix",
	"$schema",
	"title",
	"description",
	"blocks",
	"links",
	"meta"
];
var BLOCK_FIELDS = [
	"id",
	"title",
	"description",
	"details",
	"icon",
	"size",
	"children",
	"meta"
];
var LINK_FIELDS = [
	"id",
	"from",
	"to",
	"label",
	"description",
	"direction",
	"meta"
];
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/**
* Checks a parsed value against format v1. Works on untrusted input, so it
* never throws: everything is reported as issues.
*/
function validateDocument(input) {
	const issues = [];
	const add = (severity, code, path, message) => issues.push({
		severity,
		code,
		path,
		message
	});
	const error = (code, path, message) => add("error", code, path, message);
	const checkString = (obj, key, path, required) => {
		const value = obj[key];
		if (value === void 0) {
			if (required) error("missing-field", path, `"${key}" is required`);
			return;
		}
		if (typeof value !== "string") error("invalid-type", `${path}/${key}`, `"${key}" must be a string`);
		else if (required && value.trim() === "") error("invalid-value", `${path}/${key}`, `"${key}" must not be empty`);
	};
	const checkUnknown = (obj, allowed, path) => {
		for (const key of Object.keys(obj)) if (!allowed.includes(key)) add("warning", "unknown-field", `${path}/${key}`, `Unknown field "${key}"`);
	};
	const checkSize = (obj, path) => {
		if (obj.size !== void 0 && !SIZES.includes(obj.size)) error("invalid-value", `${path}/size`, `"size" must be one of: ${SIZES.join(", ")}`);
	};
	const checkMeta = (obj, path) => {
		if (obj.meta !== void 0 && !isObject(obj.meta)) error("invalid-type", `${path}/meta`, "\"meta\" must be an object");
	};
	if (!isObject(input)) {
		error("invalid-type", "", "Document must be a JSON object");
		return {
			valid: false,
			issues
		};
	}
	const version = input.takesix;
	if (version === void 0) error("missing-field", "", "\"takesix\" version field is required");
	else if (typeof version !== "string" || !/^\d+\.\d+$/.test(version)) error("invalid-value", "/takesix", "\"takesix\" must be a version string like \"1.0\"");
	else if (Number(version.split(".")[0]) !== 1) error("unsupported-version", "/takesix", `Version ${version} is not supported, expected 1.x`);
	checkString(input, "title", "", true);
	checkString(input, "description", "", false);
	checkMeta(input, "");
	checkUnknown(input, DOCUMENT_FIELDS, "");
	const seenIds = /* @__PURE__ */ new Map();
	const checkBlocks = (value, path) => {
		if (!Array.isArray(value)) {
			error("invalid-type", path, "Blocks must be an array");
			return;
		}
		if (value.length > 6) error("too-many-blocks", path, `${value.length} blocks on one level, at most 6 allowed. Group some of them into a parent block.`);
		value.forEach((block, i) => {
			const bp = `${path}/${i}`;
			if (!isObject(block)) {
				error("invalid-type", bp, "Block must be an object");
				return;
			}
			checkString(block, "id", bp, true);
			checkString(block, "title", bp, true);
			checkString(block, "description", bp, false);
			checkString(block, "details", bp, false);
			checkString(block, "icon", bp, false);
			checkSize(block, bp);
			checkMeta(block, bp);
			checkUnknown(block, BLOCK_FIELDS, bp);
			if (typeof block.id === "string" && block.id !== "") {
				const first = seenIds.get(block.id);
				if (first !== void 0) error("duplicate-id", `${bp}/id`, `Id "${block.id}" is already used at ${first}`);
				else seenIds.set(block.id, bp);
			}
			if (block.children !== void 0) checkBlocks(block.children, `${bp}/children`);
		});
	};
	if (input.blocks === void 0) error("missing-field", "", "\"blocks\" is required");
	else checkBlocks(input.blocks, "/blocks");
	if (input.links !== void 0) {
		if (!Array.isArray(input.links)) error("invalid-type", "/links", "\"links\" must be an array");
		else {
			const index = Array.isArray(input.blocks) ? buildIndex(input) : /* @__PURE__ */ new Map();
			const seenLinkIds = /* @__PURE__ */ new Map();
			input.links.forEach((link, i) => {
				const lp = `/links/${i}`;
				if (!isObject(link)) {
					error("invalid-type", lp, "Link must be an object");
					return;
				}
				checkString(link, "id", lp, false);
				checkString(link, "from", lp, true);
				checkString(link, "to", lp, true);
				checkString(link, "label", lp, false);
				checkString(link, "description", lp, false);
				checkMeta(link, lp);
				checkUnknown(link, LINK_FIELDS, lp);
				if (link.direction !== void 0 && !LINK_DIRECTIONS.includes(link.direction)) error("invalid-value", `${lp}/direction`, `"direction" must be one of: ${LINK_DIRECTIONS.join(", ")}`);
				if (typeof link.id === "string") {
					const first = seenLinkIds.get(link.id);
					if (first !== void 0) error("duplicate-link-id", `${lp}/id`, `Link id "${link.id}" is already used at ${first}`);
					else seenLinkIds.set(link.id, lp);
				}
				const { from, to } = link;
				if (typeof from !== "string" || typeof to !== "string") return;
				const fromEntry = index.get(from);
				const toEntry = index.get(to);
				if (!fromEntry) error("unknown-link-endpoint", `${lp}/from`, `No block with id "${from}"`);
				if (!toEntry) error("unknown-link-endpoint", `${lp}/to`, `No block with id "${to}"`);
				if (from === to) error("self-link", lp, `Link connects block "${from}" to itself`);
				else if (fromEntry && toEntry && (fromEntry.path.includes(to) || toEntry.path.includes(from))) add("warning", "link-never-visible", lp, `Link between "${from}" and "${to}" is never shown: one block contains the other`);
			});
		}
	}
	return {
		valid: !issues.some((i) => i.severity === "error"),
		issues
	};
}
/** Formats issues as `path: message` lines, for logs and CLI output. */
function formatIssues(issues) {
	return issues.map((i) => `${i.severity} ${i.path || "/"}: ${i.message}`).join("\n");
}
// node_modules/@takesix/core/dist/migrate.js
function isLegacyDocument(input) {
	return Array.isArray(input);
}
/**
* Converts the legacy entity array into a v1 document. Per-entity
* `connections` become document-level links with ids `"<from>-><to>"`.
* A `list` layout becomes full-width children (`size: "F"`); `tiles` and
* `circle` have no equivalent and keep the default size.
*/
function migrateLegacy(entities, title = "Untitled") {
	const links = [];
	const convert = (list, parentLayout) => list.map((e) => {
		for (const to of e.connections ?? []) links.push({
			id: `${e.id}->${to}`,
			from: e.id,
			to
		});
		const block = {
			id: e.id,
			title: e.title
		};
		if (e.description) block.description = e.description;
		if (e.icon) block.icon = e.icon;
		if (parentLayout === "list") block.size = "F";
		if (e.children?.length) block.children = convert(e.children, e.layout);
		return block;
	});
	const doc = {
		takesix: "1.0",
		title,
		blocks: convert(entities)
	};
	if (links.length) doc.links = links;
	return doc;
}
// node_modules/@takesix/core/dist/parse.js
/**
* Reads a document from JSON text or an already parsed value: parses,
* migrates older formats and validates. Never throws.
*/
function parseDocument(input) {
	let value = input;
	if (typeof input === "string") try {
		value = JSON.parse(input);
	} catch (e) {
		return {
			ok: false,
			issues: [{
				severity: "error",
				code: "invalid-type",
				path: "",
				message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
			}]
		};
	}
	let migratedFrom;
	if (isLegacyDocument(value)) {
		value = migrateLegacy(value);
		migratedFrom = "legacy";
	}
	const { valid, issues } = validateDocument(value);
	if (!valid) return {
		ok: false,
		issues
	};
	const result = {
		ok: true,
		document: value,
		issues
	};
	if (migratedFrom) result.migratedFrom = migratedFrom;
	return result;
}
// node_modules/@takesix/core/dist/links.js
/**
* Projects document links onto the screen of `parentId` (`null` = top level).
*
* Each endpoint is replaced by its ancestor on that level, so a link between
* deeply nested blocks shows up as an arrow between the blocks that contain
* them. Links whose endpoints land in the same block, or outside this level,
* are not shown. Several links between the same pair of blocks merge into one
* arrow.
*/
function visibleLinks(doc, parentId, index = buildIndex(doc)) {
	let depth = 0;
	if (parentId !== null) {
		const parent = index.get(parentId);
		if (!parent) return [];
		depth = parent.depth + 1;
	}
	const project = (id) => {
		const entry = index.get(id);
		if (!entry) return void 0;
		if (parentId !== null && entry.path[depth - 1] !== parentId) return void 0;
		return entry.path[depth];
	};
	const groups = /* @__PURE__ */ new Map();
	for (const link of doc.links ?? []) {
		const from = project(link.from);
		const to = project(link.to);
		if (from === void 0 || to === void 0 || from === to) continue;
		const [a, b] = from < to ? [from, to] : [to, from];
		const key = `${a}|${b}`;
		let g = groups.get(key);
		if (!g) {
			g = {
				a,
				b,
				first: [from, to],
				links: [],
				forward: false,
				backward: false,
				both: false,
				direct: true
			};
			groups.set(key, g);
		}
		g.links.push(link);
		const direction = link.direction ?? "forward";
		if (direction === "both") g.both = true;
		else if (direction === "forward") {
			if (from === a) g.forward = true;
			else g.backward = true;
		}
		if (link.from !== from || link.to !== to) g.direct = false;
	}
	return [...groups.values()].map((g) => {
		let [from, to] = g.first;
		let direction;
		if (g.both || g.forward && g.backward) direction = "both";
		else if (g.forward || g.backward) {
			direction = "forward";
			[from, to] = g.forward ? [g.a, g.b] : [g.b, g.a];
		} else direction = "none";
		return {
			key: `${from}|${to}`,
			from,
			to,
			direction,
			links: g.links,
			direct: g.direct
		};
	});
}
// src/render.ts
var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/**
* One self-contained HTML page: the document as JSON plus the inlined viewer.
* `<` in the JSON is escaped, so no text in the document can close the
* <script> element and inject markup.
*/
function renderHtml(doc, viewerJs, viewerCss) {
	const json = JSON.stringify(doc).replace(/</g, "\\u003c");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="takesix">
<title>${escapeHtml(doc.title)}</title>
<style>html, body, #root { height: 100%; margin: 0; }</style>
<style>${viewerCss}</style>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="takesix-data">${json}<\/script>
<script>${viewerJs}<\/script>
</body>
</html>
`;
}
// src/summary.ts
/** One line about the shape of a valid document, to help an agent judge it. */
function summarize(doc) {
	const index = buildIndex(doc);
	const depth = Math.max(0, ...[...index.values()].map((e) => e.depth + 1));
	const links = doc.links?.length ?? 0;
	const top = visibleLinks(doc, null, index);
	const merged = top.filter((l) => !l.direct).length;
	return `${index.size} blocks on ${depth} level${depth === 1 ? "" : "s"}, ${links} link${links === 1 ? "" : "s"}; top level shows ${top.length} arrow${top.length === 1 ? "" : "s"}` + (merged ? ` (${merged} merged from nested links: check they are wanted there)` : "");
}
// src/cli.ts
var USAGE = `Usage:
  takesix validate <file.json>              check a document, list problems with paths
  takesix render <file.json> [-o out.html]  validate, then write one self-contained HTML page`;
var assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
function load(file) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch (e) {
		console.error(`Cannot read ${file}: ${e.message}`);
		process.exit(2);
	}
	const result = parseDocument(text);
	if (!result.ok) {
		console.error(`${file}: invalid takesix document. Fix these and run again:`);
		console.error(formatIssues(result.issues));
		process.exit(1);
	}
	if (result.issues.length) console.error(formatIssues(result.issues));
	return result.document;
}
var [command, file, ...rest] = process.argv.slice(2);
if (!command || !file || !["validate", "render"].includes(command)) {
	console.error(USAGE);
	process.exit(2);
}
var doc = load(file);
if (command === "validate") console.log(`OK: ${summarize(doc)}`);
else {
	const o = rest.indexOf("-o");
	const out = resolve(o >= 0 && rest[o + 1] ? rest[o + 1] : join(dirname(file), basename(file).replace(/(\.takesix)?\.json$/, "") + ".html"));
	const html = renderHtml(doc, readFileSync(join(assets, "viewer.js"), "utf8"), readFileSync(join(assets, "viewer.css"), "utf8"));
	writeFileSync(out, html);
	console.log(`OK: ${summarize(doc)}\nWrote ${out}`);
}
export {};
