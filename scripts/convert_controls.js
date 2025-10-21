#!/usr/bin/env node
/**
 * Convert controls.md to a CSV suitable for Google Sheets.
 * Usage:
 *   node scripts/convert_controls.js [--in <path/to/controls.md>] [--out <path/to/output.csv>] [--stdout]
 * Defaults:
 *   --in  ./controls.md
 *   --out ./controls_export.csv
 */

const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    in: path.resolve(process.cwd(), "controls.md"),
    out: path.resolve(process.cwd(), "controls_export.csv"),
    stdout: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--in" && args[i + 1]) {
      opts.in = path.resolve(process.cwd(), args[++i]);
      continue;
    }
    if (a === "--out" && args[i + 1]) {
      opts.out = path.resolve(process.cwd(), args[++i]);
      continue;
    }
    if (a === "--stdout") {
      opts.stdout = true;
      continue;
    }
  }
  return opts;
}

function csvEscape(value) {
  const s = (value || "").toString().replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(rows, header) {
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.domain,
        r.id,
        r.name,
        r.type,
        r.ig,
        r.cis,
        r.description,
        r.verification,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

function parseControlsMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);

  const domainRe = /^###\s+\d+\.\s+(.+?)\s*$/;
  const controlRowRe =
    /^\|\s*\*\*([A-Z]{2,3}-\d+)\*\*\s*\|\s*(.+?)\s*\|\s*(Technical|Organizational)\s*\|\s*(IG\d)\s*\|\s*(.*?)\s*\|?$/;
  const descRe = /^\|\s*\*\*Description\*\*\s*\|\s*(.+?)\s*\|?$/;
  const verifRe = /^\|\s*\*\*Verification Method\*\*\s*\|\s*(.+?)\s*\|?$/;
  const nextCtrlRe = /^\|\s*\*\*[A-Z]{2,3}-\d+\*\*/;

  let currentDomain = "";
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dm = line.match(domainRe);
    if (dm) {
      currentDomain = dm[1].trim();
      continue;
    }

    const cm = line.match(controlRowRe);
    if (!cm) continue;

    const id = cm[1].trim();
    const name = cm[2].trim();
    const type = cm[3].trim();
    const ig = cm[4].trim();
    const cis = (cm[5] || "").trim().replace(/^—$/, "");

    // Look ahead for Description & Verification within the next few lines until the next control/domain
    let description = "";
    let verification = "";
    for (let j = i + 1; j < Math.min(lines.length, i + 20); j++) {
      const l = lines[j];
      if (domainRe.test(l) || nextCtrlRe.test(l)) break;
      const d = l.match(descRe);
      if (d && !description) description = d[1].trim();
      const v = l.match(verifRe);
      if (v && !verification) verification = v[1].trim();
      if (description && verification) break;
    }

    rows.push({
      domain: currentDomain,
      id,
      name,
      type,
      ig,
      cis,
      description,
      verification,
    });
  }

  return rows;
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(opts.in)) {
    console.error(`Input file not found: ${opts.in}`);
    process.exit(1);
  }
  const md = fs.readFileSync(opts.in, "utf8");
  const rows = parseControlsMarkdown(md);
  const header = [
    "Domain",
    "Control ID",
    "Control Name",
    "Type",
    "IG",
    "CIS v8",
    "Description",
    "Verification Method",
  ];
  const csv = toCSV(rows, header);

  if (opts.stdout) {
    process.stdout.write(csv + "\n");
    return;
  }

  fs.writeFileSync(opts.out, csv);
  console.log(`Wrote ${opts.out} (${rows.length} controls)`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
