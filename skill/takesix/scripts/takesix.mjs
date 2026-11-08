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
var LINK_STYLES = [
	"solid",
	"dashed",
	"dotted"
];
var BLOCK_SHAPES = [
	"process",
	"terminator",
	"decision",
	"io",
	"subprocess",
	"loop-start",
	"loop-end"
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
// node_modules/@takesix/core/dist/flow.js
var isObject$1 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/** Exits a condition may have: yes/no, or three for less/equal/greater. */
var MIN_EXITS = 2;
var MAX_EXITS = 3;
/** JSON Pointer of a block, from its path of ids. */
function pointer(path, blocks, index) {
	let p = "/blocks";
	let siblings = blocks;
	path.forEach((id, depth) => {
		const block = index.get(id).block;
		if (depth > 0) p += "/children";
		p += `/${siblings.indexOf(block)}`;
		siblings = block.children ?? [];
	});
	return p;
}
/**
* Warnings for flowchart blocks: a `decision` should have 2–3 exits on its
* level, each with a `label` ("yes", "no"); a level should have at most one
* start, a `terminator` nothing leads into.
*/
function flowIssues(blocks, links, index) {
	const issues = [];
	const edges = links.filter(isObject$1).flatMap((l) => {
		const from = l.from;
		const to = l.to;
		if (typeof from !== "string" || typeof to !== "string" || from === to) return [];
		const a = index.get(from);
		const b = index.get(to);
		if (!a || !b || a.parentId !== b.parentId) return [];
		return [{
			from,
			to,
			label: typeof l.label === "string" ? l.label.trim() : "",
			both: l.direction === "both"
		}];
	});
	const starts = /* @__PURE__ */ new Map();
	for (const [id, entry] of index) {
		const shape = entry.block.shape;
		if (shape === "decision") {
			const exits = edges.filter((e) => e.from === id || e.both && e.to === id);
			const path = pointer(entry.path, blocks, index);
			if (exits.length < MIN_EXITS || exits.length > MAX_EXITS) issues.push({
				severity: "warning",
				code: "decision-exits",
				path,
				message: `Decision "${id}" has ${exits.length} exit${exits.length === 1 ? "" : "s"}: a condition leads to ${MIN_EXITS} or ${MAX_EXITS} blocks on its level, one link each`
			});
			if (exits.some((e) => e.label === "")) issues.push({
				severity: "warning",
				code: "decision-exit-label",
				path,
				message: `Every exit of decision "${id}" needs a "label" saying when it is taken, like "yes" and "no"`
			});
		} else if (shape === "terminator") {
			if (!edges.some((e) => e.to === id || e.both && e.from === id)) starts.set(entry.parentId, [...starts.get(entry.parentId) ?? [], id]);
		}
	}
	for (const [parentId, ids] of starts) {
		if (ids.length < 2) continue;
		issues.push({
			severity: "warning",
			code: "several-starts",
			path: parentId === null ? "/blocks" : `${pointer(index.get(parentId).path, blocks, index)}/children`,
			message: `${ids.length} terminators start this level (${ids.map((i) => `"${i}"`).join(", ")}): a flowchart has one start; link into the others or make them a different shape`
		});
	}
	return issues;
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
	"shape",
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
	"style",
	"meta"
];
/** A block opens either into blocks or into text; the ways out, in the order to try them. */
var DETAILS_WITH_CHILDREN = (id) => `Block "${id}" has both "children" and "details": a block opens either into blocks or into text. Drop text that only introduces the children (the screen header and the cards already do that); put a one-line introduction into "description"; move real content into a child block of its own, named for what it says, with the text in its "details", or into the "details" of the children it is about; or, when the children are small, remove them and fold what they say into this block's "details"`;
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
			if (block.shape !== void 0 && !BLOCK_SHAPES.includes(block.shape)) error("invalid-value", `${bp}/shape`, `"shape" must be one of: ${BLOCK_SHAPES.join(", ")}`);
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
			if (block.children !== void 0 && block.details !== void 0) error("details-with-children", `${bp}/details`, DETAILS_WITH_CHILDREN(String(block.id)));
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
				if (link.style !== void 0 && !LINK_STYLES.includes(link.style)) error("invalid-value", `${lp}/style`, `"style" must be one of: ${LINK_STYLES.join(", ")}`);
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
				else if (fromEntry && toEntry && fromEntry.parentId !== toEntry.parentId) add("warning", "link-never-visible", lp, `Link between "${from}" and "${to}" is never shown: only blocks of one level are linked. Link the blocks that contain them, on the level they share`);
			});
			if (Array.isArray(input.blocks)) issues.push(...flowIssues(input.blocks, input.links, index));
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
* The arrows on the screen of `parentId` (`null` = top level): links between
* two blocks of that level. Links between blocks of different levels are
* never drawn. Several links between the same pair of blocks merge into one
* arrow, opposite one-way links into a two-way arrow.
*/
function visibleLinks(doc, parentId, index = buildIndex(doc)) {
	if (parentId !== null && !index.has(parentId)) return [];
	const onLevel = (id) => {
		const entry = index.get(id);
		return entry !== void 0 && entry.parentId === parentId;
	};
	const groups = /* @__PURE__ */ new Map();
	for (const link of doc.links ?? []) {
		const { from, to } = link;
		if (from === to || !onLevel(from) || !onLevel(to)) continue;
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
				both: false
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
	}
	return [...groups.values()].map((g) => {
		let [from, to] = g.first;
		let direction;
		if (g.both || g.forward && g.backward) direction = "both";
		else if (g.forward || g.backward) {
			direction = "forward";
			[from, to] = g.forward ? [g.a, g.b] : [g.b, g.a];
		} else direction = "none";
		const styles = new Set(g.links.map((l) => l.style ?? "solid"));
		const style = styles.size === 1 ? [...styles][0] : "solid";
		return {
			key: `${from}|${to}`,
			from,
			to,
			direction,
			style,
			links: g.links
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
/**
* The lines an arrow between two areas follows, given the other blocks of the
* level. Like {@link arrowSegment}, except that a straight arrow with a block
* in its way goes around it, as the viewer draws it: blocks sharing rows by
* the gap below them, blocks sharing columns (a loop back up, say) by the gap
* beside them, on the side that crosses fewer blocks, then the one with fewer
* blocks beside it, then the shorter one. Viewers keep room beside the outer
* columns for it.
*/
function arrowRoute(a, b, others) {
	const straight = arrowSegment(a, b);
	const blocking = others.filter((o) => crossesArea(straight, o));
	const shareRows = sharedMiddle(a.row, a.height, b.row, b.height) !== void 0;
	const shareCols = sharedMiddle(a.col, a.width, b.col, b.width) !== void 0;
	if (!blocking.length || !shareRows && !shareCols) return [straight];
	const ra = box(a);
	const rb = box(b);
	const boxes = [
		ra,
		rb,
		...blocking.map(box)
	];
	const via = (p, q, lane, horizontal) => {
		const p2 = horizontal ? {
			x: lane.x,
			y: p.y
		} : {
			x: p.x,
			y: lane.y
		};
		const q2 = horizontal ? {
			x: lane.x,
			y: q.y
		} : {
			x: q.x,
			y: lane.y
		};
		return [
			[p, p2],
			[p2, q2],
			[q2, q]
		];
	};
	if (shareRows) {
		const lane = Math.max(...boxes.map((r) => r.bottom)) + GAP / 2;
		return via({
			x: (ra.left + ra.right) / 2,
			y: ra.bottom
		}, {
			x: (rb.left + rb.right) / 2,
			y: rb.bottom
		}, {
			x: 0,
			y: lane
		}, false);
	}
	const ay = (ra.top + ra.bottom) / 2;
	const by = (rb.top + rb.bottom) / 2;
	const right = via({
		x: ra.right,
		y: ay
	}, {
		x: rb.right,
		y: by
	}, {
		x: Math.max(...boxes.map((r) => r.right)) + GAP / 2,
		y: 0
	}, true);
	const left = via({
		x: ra.left,
		y: ay
	}, {
		x: rb.left,
		y: by
	}, {
		x: Math.min(...boxes.map((r) => r.left)) - GAP / 2,
		y: 0
	}, true);
	const crossed = (route) => others.filter((o) => route.some((s) => crossesArea(s, o))).length;
	const length = (route) => route.reduce((n, [p, q]) => n + Math.abs(q.x - p.x) + Math.abs(q.y - p.y), 0);
	const top = Math.min(...boxes.map((r) => r.top));
	const bottom = Math.max(...boxes.map((r) => r.bottom));
	const beside = (side) => others.map(box).filter((o) => o.top < bottom && o.bottom > top && (side === "right" ? o.left >= Math.max(...boxes.map((r) => r.right)) : o.right <= Math.min(...boxes.map((r) => r.left)))).length;
	const score = (route, side) => crossed(route) * 1e3 + beside(side) * 100 + length(route);
	return score(left, "left") < score(right, "right") ? left : right;
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
* that run through a third block (after going around the blocks in the way
* of a straight arrow, see {@link arrowRoute}) and arrows that cross each
* other. Editors show them next to the arrows.
*/
function levelLayoutIssues(doc, parentId, index = buildIndex(doc)) {
	const areas = levelAreas(getLevel(doc, parentId, index));
	const arrows = visibleLinks(doc, parentId, index).flatMap((link) => {
		const a = areas.get(link.from);
		const b = areas.get(link.to);
		if (!a || !b) return [];
		return [{
			link,
			route: arrowRoute(a, b, [...areas].filter(([id]) => id !== link.from && id !== link.to).map(([, area]) => area))
		}];
	});
	const name = (link) => `"${link.from}" → "${link.to}"`;
	const issues = [];
	for (const { link, route } of arrows) for (const [id, area] of areas) {
		if (id === link.from || id === link.to || !route.some((s) => crossesArea(s, area))) continue;
		issues.push({
			code: "arrow-crosses-block",
			message: `Arrow ${name(link)} has block "${id}" in its way: place the two blocks next to each other`,
			arrows: [link.key],
			blocks: [id]
		});
	}
	arrows.forEach((first, i) => {
		for (const second of arrows.slice(i + 1)) {
			if ([first.link.from, first.link.to].some((id) => id === second.link.from || id === second.link.to) || !first.route.some((s) => second.route.some((t) => segmentsCross(s, t)))) continue;
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
	const issues = formatIssues(lintLayout(doc));
	const text = textHints(doc);
	if (!issues && !text.length) return "";
	return `Layout hints (the document is valid, but these screens read worse):\n${[issues, ...text].filter(Boolean).join("\n")}\n`;
}
var TITLE_CHARS = [
	15,
	40,
	65,
	85,
	110,
	130
];
var DESCRIPTION_CHARS = [
	19,
	50,
	85,
	110,
	140,
	165
];
/** Description lines a card of this size shows: one per one-row card, more per row. */
var descriptionLines = (width, height) => height === 1 ? width === 6 ? 2 : 1 : 1 + 6 * (height - 1);
/**
* Blocks whose title or description is longer than their card shows: the
* viewer ends the description with "…". One `warning path: message` line each.
*/
function textHints(doc) {
	const out = [];
	const level = (blocks, path) => {
		const areas = levelAreas(blocks);
		blocks.forEach((block, i) => {
			const a = areas.get(block.id);
			if (a) {
				const size = `${a.width}×${a.height}`;
				const titleFits = TITLE_CHARS[a.width - 1] * (a.height === 1 ? 1 : 2);
				if (block.title.length > titleFits) out.push(`warning ${path}/${i}/title: Title of "${block.id}" (${size}) has ${block.title.length} characters, about ${titleFits} fit; shorten it or widen the block`);
				const descriptionFits = DESCRIPTION_CHARS[a.width - 1] * descriptionLines(a.width, a.height);
				const length = block.description?.length ?? 0;
				if (length > descriptionFits) out.push(`warning ${path}/${i}/description: Description of "${block.id}" (${size}) has ${length} characters, about ${descriptionFits} fit and the rest ends in "…"; shorten it${block.children ? "" : ", move the rest to details"} or widen the block`);
			}
			if (block.children?.length) level(block.children, `${path}/${i}/children`);
		});
	};
	level(doc.blocks, "/blocks");
	return out;
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
var n = `<div class="takesix-preloader" role="status" aria-label="Loading the diagram"><style>
.takesix-preloader{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
height:100%;min-height:240px;background:#f0f2f5;color:#8fa3b8;font:500 0.8rem/1.4 system-ui,-apple-system,sans-serif;
opacity:0;animation:takesix-preloader-in .3s ease-out .4s forwards}
.takesix-preloader svg{animation:takesix-preloader-breathe 1.6s ease-in-out .4s infinite}
.takesix-preloader[data-error]{opacity:1;animation:none;padding:24px;text-align:center}
.takesix-preloader[data-error] svg{animation:none}
.takesix-preloader p{margin:0;max-width:60ch;color:#c2410c;white-space:pre-wrap}
@keyframes takesix-preloader-in{to{opacity:1}}
@keyframes takesix-preloader-breathe{50%{opacity:.45}}
@media (prefers-color-scheme:dark){.takesix-preloader{background:#0f141b;color:#7d8ca0}.takesix-preloader p{color:#fb923c}}
@media (prefers-reduced-motion:reduce){.takesix-preloader svg{animation:none}}
</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 2 35 35" width="56" height="56" fill="currentColor" aria-hidden="true">
<rect x="3.6" y="9" width="3.6" height="12" rx="1.8"/><rect x="7.9" y="5" width="3.6" height="16" rx="1.8"/>
<rect x="12.2" y="3" width="3.6" height="18" rx="1.8"/><rect x="16.5" y="4" width="3.6" height="17" rx="1.8"/>
<rect x="20.8" y="7" width="3.6" height="14" rx="1.8"/>
<path d="M3.6 18.6L7.55 17.6L11.85 15.4L16.15 14.6L20.45 15.3L24.4 16.6V29.5C24.4 33.3 21.4 36 17.6 36H10.6C6.7 36 3.6 33 3.6 29.1Z"/>
<line x1="21.5" y1="31" x2="28.4" y2="19.6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
</svg></div>`;
// src/render.ts
var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/**
* One self-contained HTML page: the document as JSON plus the inlined viewer.
* Until the viewer renders, a loading screen without script shows instead.
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
<div id="root">${n}</div>
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
	const across = (doc.links ?? []).filter((l) => index.get(l.from)?.parentId !== index.get(l.to)?.parentId).length;
	return `${index.size} blocks on ${depth} level${depth === 1 ? "" : "s"}, ${links} link${links === 1 ? "" : "s"}; top level shows ${top.length} arrow${top.length === 1 ? "" : "s"}` + (across ? `; ${across} link${across === 1 ? "" : "s"} between levels not drawn: link the blocks that contain them` : "");
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
