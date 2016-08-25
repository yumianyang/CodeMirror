import { indexOf } from "./utils"
import { bidiOrdering } from "./utils_bidi";
import { clipLine } from "./utils_pos";
import { regLineChange } from "./view_tracking";

// LINE UTILITIES

// Find the line object corresponding to the given line number.
export function getLine(doc, n) {
  n -= doc.first;
  if (n < 0 || n >= doc.size) throw new Error("There is no line " + (n + doc.first) + " in the document.");
  for (var chunk = doc; !chunk.lines;) {
    for (var i = 0;; ++i) {
      var child = chunk.children[i], sz = child.chunkSize();
      if (n < sz) { chunk = child; break; }
      n -= sz;
    }
  }
  return chunk.lines[n];
}

// Get the part of a document between two positions, as an array of
// strings.
export function getBetween(doc, start, end) {
  var out = [], n = start.line;
  doc.iter(start.line, end.line + 1, function(line) {
    var text = line.text;
    if (n == end.line) text = text.slice(0, end.ch);
    if (n == start.line) text = text.slice(start.ch);
    out.push(text);
    ++n;
  });
  return out;
}
// Get the lines between from and to, as array of strings.
export function getLines(doc, from, to) {
  var out = [];
  doc.iter(from, to, function(line) { out.push(line.text); });
  return out;
}

// Update the height of a line, propagating the height change
// upwards to parent nodes.
export function updateLineHeight(line, height) {
  var diff = height - line.height;
  if (diff) for (var n = line; n; n = n.parent) n.height += diff;
}

// Given a line object, find its line number by walking up through
// its parent links.
export function lineNo(line) {
  if (line.parent == null) return null;
  var cur = line.parent, no = indexOf(cur.lines, line);
  for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
    for (var i = 0;; ++i) {
      if (chunk.children[i] == cur) break;
      no += chunk.children[i].chunkSize();
    }
  }
  return no + cur.first;
}

// Find the line at the given vertical position, using the height
// information in the document tree.
export function lineAtHeight(chunk, h) {
  var n = chunk.first;
  outer: do {
    for (var i = 0; i < chunk.children.length; ++i) {
      var child = chunk.children[i], ch = child.height;
      if (h < ch) { chunk = child; continue outer; }
      h -= ch;
      n += child.chunkSize();
    }
    return n;
  } while (!chunk.lines);
  for (var i = 0; i < chunk.lines.length; ++i) {
    var line = chunk.lines[i], lh = line.height;
    if (h < lh) break;
    h -= lh;
  }
  return n + i;
}

// Get the bidi ordering for the given line (and cache it). Returns
// false for lines that are fully left-to-right, and an array of
// BidiSpan objects otherwise.
export function getOrder(line) {
  var order = line.order;
  if (order == null) order = line.order = bidiOrdering(line.text);
  return order;
}

// Utility for applying a change to a line by handle or number,
// returning the number and optionally registering the line as
// changed.
export function changeLine(doc, handle, changeType, op) {
  var no = handle, line = handle;
  if (typeof handle == "number") line = getLine(doc, clipLine(doc, handle));
  else no = lineNo(handle);
  if (no == null) return null;
  if (op(line, no) && doc.cm) regLineChange(doc.cm, no, changeType);
  return line;
}

export function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size;}

export function lineNumberFor(options, i) {
  return String(options.lineNumberFormatter(i + options.firstLineNumber));
}
