#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// node_modules/@takesix/core/dist/constants.js
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
// node_modules/@takesix/core/dist/grid.js
var CELL$1 = /^([A-Z])(\d+)$/;
function parseCell(cell) {
	const m = CELL$1.exec(cell);
	if (!m) return void 0;
	const col = m[1].charCodeAt(0) - 65;
	const row = Number(m[2]) - 1;
	if (col >= 6 || row < 0 || row >= 6) return void 0;
	return {
		col,
		row
	};
}
/**
* Reads an `at` value: one cell (`"B3"`) or a range of cells, both corners
* included (`"A1:C2"`). Returns a message instead of an area when the value
* is malformed, so the validator can say what is wrong.
*/
function readArea(at) {
	const [first, last, extra] = at.split(":");
	const start = parseCell(first);
	const end = last === void 0 ? start : parseCell(last);
	if (extra !== void 0 || !start || !end) return `"${at}" is not a cell like "B3" or a range like "A1:C2" (columns A–F, rows 1–6)`;
	if (end.col < start.col || end.row < start.row) return `"${at}" ends before it starts: write the top-left cell first`;
	return {
		col: start.col,
		row: start.row,
		width: end.col - start.col + 1,
		height: end.row - start.row + 1
	};
}
/** The area of an `at` value, or `undefined` when it is malformed. */
function parseArea(at) {
	const area = readArea(at);
	return typeof area === "string" ? void 0 : area;
}
var cellName = (col, row) => `${String.fromCharCode(65 + col)}${row + 1}`;
/** The top-left cell two areas share, e.g. `"B2"`, or `undefined` if they do not overlap. */
function overlap(a, b) {
	const col = Math.max(a.col, b.col);
	const row = Math.max(a.row, b.row);
	if (col >= Math.min(a.col + a.width, b.col + b.width) || row >= Math.min(a.row + a.height, b.row + b.height)) return void 0;
	return cellName(col, row);
}
/** Areas of the blocks of one level, skipping blocks whose `at` is malformed. */
function levelAreas(blocks) {
	const areas = /* @__PURE__ */ new Map();
	for (const block of blocks) {
		const area = typeof block.at === "string" ? parseArea(block.at) : void 0;
		if (area) areas.set(block.id, area);
	}
	return areas;
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
	"at",
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
	const checkArea = (obj, path) => {
		if (obj.at === void 0) {
			error("missing-field", path, "\"at\" is required: the block's cell or range on the 6×6 grid, like \"A1:C2\"");
			return;
		}
		if (typeof obj.at !== "string") {
			error("invalid-type", `${path}/at`, "\"at\" must be a string like \"A1:C2\"");
			return;
		}
		const area = readArea(obj.at);
		if (typeof area === "string") {
			error("invalid-value", `${path}/at`, area);
			return;
		}
		return area;
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
		const placed = [];
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
			const area = checkArea(block, bp);
			if (area) {
				const other = placed.find((p) => overlap(p.area, area));
				if (other) error("overlap", `${bp}/at`, `Blocks "${String(other.id)}" and "${String(block.id)}" overlap at ${overlap(other.area, area)}`);
				placed.push({
					id: block.id,
					area
				});
			}
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
// node_modules/@takesix/core/dist/query.js
/** Blocks shown on the screen of `parentId` (`null` = top level). Empty if not found. */
function getLevel(doc, parentId, index = buildIndex(doc)) {
	if (parentId === null) return doc.blocks;
	return index.get(parentId)?.block.children ?? [];
}
// node_modules/@takesix/core/dist/layout.js
/** Gap between cells, in cell units. */
var GAP = .25;
var lineStart = (i) => i * 1.25;
var lineEnd = (i, n) => (i + n) * 1.25 - GAP;
function box(area) {
	return {
		left: lineStart(area.col),
		right: lineEnd(area.col, area.width),
		top: lineStart(area.row),
		bottom: lineEnd(area.row, area.height)
	};
}
/** Middle of the cells shared by two ranges `[s1, s1 + n1)` and `[s2, s2 + n2)`, or `undefined`. */
function sharedMiddle(s1, n1, s2, n2) {
	const start = Math.max(s1, s2);
	const end = Math.min(s1 + n1, s2 + n2);
	return start < end ? (lineStart(start) + lineEnd(start, end - start)) / 2 : void 0;
}
/** The line an arrow between two non-overlapping areas roughly follows. */
function arrowSegment(a, b) {
	const ra = box(a);
	const rb = box(b);
	const y = sharedMiddle(a.row, a.height, b.row, b.height);
	if (y !== void 0) return a.col < b.col ? [{
		x: ra.right,
		y
	}, {
		x: rb.left,
		y
	}] : [{
		x: ra.left,
		y
	}, {
		x: rb.right,
		y
	}];
	const x = sharedMiddle(a.col, a.width, b.col, b.width);
	if (x === void 0) {
		const ay = (ra.top + ra.bottom) / 2;
		const by = (rb.top + rb.bottom) / 2;
		return a.col < b.col ? [{
			x: ra.right,
			y: ay
		}, {
			x: rb.left,
			y: by
		}] : [{
			x: ra.left,
			y: ay
		}, {
			x: rb.right,
			y: by
		}];
	}
	return b.row > a.row ? [{
		x,
		y: ra.bottom
	}, {
		x,
		y: rb.top
	}] : [{
		x,
		y: ra.top
	}, {
		x,
		y: rb.bottom
	}];
}
/** Whether a segment passes through the inside of an area (touching an edge does not count). */
function crossesArea([p, q], area) {
	const e = .01;
	const r = box(area);
	const left = r.left + e;
	const right = r.right - e;
	const top = r.top + e;
	const bottom = r.bottom - e;
	let t0 = 0;
	let t1 = 1;
	const dx = q.x - p.x;
	const dy = q.y - p.y;
	const edges = [
		[-dx, p.x - left],
		[dx, right - p.x],
		[-dy, p.y - top],
		[dy, bottom - p.y]
	];
	for (const [pe, qe] of edges) {
		if (pe === 0) {
			if (qe < 0) return false;
			continue;
		}
		const t = qe / pe;
		if (pe < 0) t0 = Math.max(t0, t);
		else t1 = Math.min(t1, t);
		if (t0 > t1) return false;
	}
	return true;
}
var cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
/** Whether two segments cross at a single point inside both (shared ends and collinear runs do not count). */
function segmentsCross([a, b], [c, d]) {
	const d1 = cross(c, d, a);
	const d2 = cross(c, d, b);
	const d3 = cross(a, b, c);
	const d4 = cross(a, b, d);
	return d1 * d2 < 0 && d3 * d4 < 0;
}
/**
* Layout problems of the screen of `parentId` (`null` = top level): arrows
* that run through a third block and arrows that cross each other, including
* arrows merged from nested links. Editors show them next to the arrows.
*/
function levelLayoutIssues(doc, parentId, index = buildIndex(doc)) {
	const areas = levelAreas(getLevel(doc, parentId, index));
	const arrows = visibleLinks(doc, parentId, index).flatMap((link) => {
		const a = areas.get(link.from);
		const b = areas.get(link.to);
		return a && b ? [{
			link,
			segment: arrowSegment(a, b)
		}] : [];
	});
	const name = (link) => `"${link.from}" → "${link.to}"`;
	const issues = [];
	for (const { link, segment } of arrows) for (const [id, area] of areas) {
		if (id === link.from || id === link.to || !crossesArea(segment, area)) continue;
		issues.push({
			code: "arrow-crosses-block",
			message: `Arrow ${name(link)} has block "${id}" in its way: place the two blocks next to each other`,
			arrows: [link.key],
			blocks: [id]
		});
	}
	arrows.forEach((first, i) => {
		for (const second of arrows.slice(i + 1)) {
			if ([first.link.from, first.link.to].some((id) => id === second.link.from || id === second.link.to) || !segmentsCross(first.segment, second.segment)) continue;
			issues.push({
				code: "arrows-cross",
				message: `Arrows ${name(first.link)} and ${name(second.link)} cross`,
				arrows: [first.link.key, second.link.key],
				blocks: []
			});
		}
	});
	return issues;
}
/**
* Layout advice for a whole valid document: {@link levelLayoutIssues} of
* every level. Only warnings: the document is fine, but its screens are
* harder to read. Paths point at the level.
*/
function lintLayout(doc) {
	const index = buildIndex(doc);
	const issues = [];
	const checkLevel = (parentId, blocks, path) => {
		for (const { code, message } of levelLayoutIssues(doc, parentId, index)) issues.push({
			severity: "warning",
			code,
			message,
			path
		});
		blocks.forEach((block, i) => {
			if (block.children?.length) checkLevel(block.id, block.children, `${path}/${i}/children`);
		});
	};
	checkLevel(null, doc.blocks, "/blocks");
	return issues;
}
// node_modules/@takesix/core/dist/parse.js
/**
* Reads a document from JSON text or an already parsed value: parses and
* validates. Never throws.
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
	const { valid, issues } = validateDocument(value);
	if (!valid) return {
		ok: false,
		issues
	};
	return {
		ok: true,
		document: value,
		issues
	};
}
// src/layout.ts
/**
* Layout advice for a valid document, one line each (arrows with a block in
* their way, arrows that cross), with a heading; empty when there is none.
*/
function layoutHints(doc) {
	const issues = lintLayout(doc);
	if (!issues.length) return "";
	return `Layout hints (the document is valid, but these screens read worse):\n${formatIssues(issues)}\n`;
}
/** Width of a cell in the sketch. */
var CELL = 10;
/**
* Every level as a text grid: each cell shows the id of the block covering it,
* `·` an empty cell. Lets an agent check its placement before rendering.
*/
function sketch(doc) {
	const out = [];
	const level = (blocks, title, depth) => {
		const indent = "  ".repeat(depth);
		const grid = Array.from({ length: 6 }, () => Array(6).fill("·"));
		for (const [id, a] of levelAreas(blocks)) for (let r = a.row; r < a.row + a.height; r++) for (let c = a.col; c < a.col + a.width; c++) grid[r][c] = id.slice(0, 9);
		out.push(`${indent}${title}`);
		out.push(`${indent}    ${"ABCDEF".split("").map((c) => c.padEnd(CELL)).join("").trimEnd()}`);
		grid.forEach((row, r) => out.push(`${indent} ${r + 1}  ${row.map((c) => c.padEnd(CELL)).join("").trimEnd()}`));
		for (const block of blocks) if (block.children?.length) level(block.children, block.title, depth + 1);
	};
	level(doc.blocks, doc.title, 0);
	return out.join("\n") + "\n";
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
  takesix sketch <file.json>                print every level's 6×6 grid as text
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
	const hints = layoutHints(result.document);
	if (hints) console.error(hints.trimEnd());
	return result.document;
}
var [command, file, ...rest] = process.argv.slice(2);
if (!command || !file || ![
	"validate",
	"sketch",
	"render"
].includes(command)) {
	console.error(USAGE);
	process.exit(2);
}
var doc = load(file);
if (command === "validate") console.log(`OK: ${summarize(doc)}`);
else if (command === "sketch") process.stdout.write(sketch(doc));
else {
	const o = rest.indexOf("-o");
	const out = resolve(o >= 0 && rest[o + 1] ? rest[o + 1] : join(dirname(file), basename(file).replace(/(\.takesix)?\.json$/, "") + ".html"));
	const html = renderHtml(doc, readFileSync(join(assets, "viewer.js"), "utf8"), readFileSync(join(assets, "viewer.css"), "utf8"));
	writeFileSync(out, html);
	console.log(`OK: ${summarize(doc)}\nWrote ${out}`);
}
export {};
