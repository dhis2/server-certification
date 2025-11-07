#!/usr/bin/env python3
import argparse
import html
import os
import re
from typing import Dict, List, Tuple

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter

ALIGN_RE = re.compile(r"\s*:?[-]+:?\s*")
HEADING_RE = re.compile(r"^###\s+(?:\d+\.[\s-]*)?(.+)$")
WRAP_ALIGN = Alignment(wrap_text=True, vertical="top")
HEADER_FONT = Font(bold=True)


def clean_cell(text: str) -> str:
    s = html.unescape(text or "").strip().replace("\u00A0", " ")
    s = s.replace("**", "").replace("*", "").replace("`", "")
    return re.sub(r"\s+", " ", s)


def is_table_line(line: str) -> bool:
    t = line.strip()
    return t.startswith("|") and t.endswith("|") and t.count("|") >= 2


def split_md_row(row: str) -> List[str]:
    inner = row.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    parts = [clean_cell(p) for p in inner.split("|")]
    return parts


def is_alignment_row(cells: List[str]) -> bool:
    return bool(cells) and all(ALIGN_RE.fullmatch(c or "") for c in cells)


def parse_md_table(lines: List[str], start_idx: int) -> Tuple[List[List[str]], int]:
    i = start_idx
    block: List[str] = []
    while i < len(lines) and is_table_line(lines[i]):
        block.append(lines[i])
        i += 1

    if not block:
        return [], start_idx

    rows = [split_md_row(r) for r in block]
    if len(rows) >= 2 and is_alignment_row(rows[1]):
        header = rows[0]
        data = rows[2:]
        return [header] + data, i
    return rows, i


def write_rows(ws, rows: List[List[str]], start_row: int, widths: Dict[int, int]) -> int:
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row):
            cell = ws.cell(row=start_row + r_idx, column=1 + c_idx, value=val)
            cell.alignment = WRAP_ALIGN
            if r_idx == 0:
                cell.font = HEADER_FONT
            length = len(str(val)) if val is not None else 0
            col = 1 + c_idx
            widths[col] = max(widths.get(col, 0), min(length + 2, 60))
    return start_row + len(rows)


def safe_sheet_name(base: str, existing: set) -> str:
    name = re.sub(r"[\\/*?:\[\]]", " ", base).strip()
    if not name:
        name = "Sheet"
    # Excel limit 31 chars
    name = name[:31]
    candidate = name
    suffix = 1
    while candidate in existing:
        tail = f" ({suffix})"
        candidate = (name[: (31 - len(tail))] + tail) if len(name) + len(tail) > 31 else name + tail
        suffix += 1
    return candidate


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    default_input = os.path.join(repo_root, "controls.md")
    default_output = os.path.join(repo_root, "controls.xlsx")

    parser = argparse.ArgumentParser(description="Convert Markdown tables in controls.md to an Excel workbook.")
    parser.add_argument("--input", "-i", default=default_input, help="Path to input Markdown file (controls.md)")
    parser.add_argument("--output", "-o", default=default_output, help="Path to output .xlsx file")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()

    wb = Workbook()
    # Remove the default empty sheet; we'll add as needed
    wb.remove(wb.active)

    sheet_names = set()
    current_domain = ""
    i = 0
    current_ws = None
    current_row = 1
    widths_by_sheet: Dict[str, Dict[int, int]] = {}

    control_header_cols = {"Control ID", "Control Name", "Type", "IG Level", "CIS v8 Mapping"}

    while i < len(lines):
        line = lines[i]

        # Track domain headers like: ### 3. OPERATING SYSTEM SECURITY
        m = HEADING_RE.match(line.strip())
        if m:
            current_domain = clean_cell(m.group(1))
            i += 1
            continue

        if is_table_line(line):
            table, i = parse_md_table(lines, i)
            if not table:
                continue

            header = [h.strip() for h in table[0]]
            header_set = set(header)

            if control_header_cols.issubset(header_set) and len(table) >= 2:
                # Start a new sheet for this control
                control_id = clean_cell(table[1][header.index("Control ID")]) if "Control ID" in header else "Control"
                base_name = control_id or "Control"
                ws_name = safe_sheet_name(base_name, sheet_names)
                current_ws = wb.create_sheet(title=ws_name)
                sheet_names.add(ws_name)
                current_row = 1
                widths_by_sheet[ws_name] = {}
                current_ws.freeze_panes = "A2"

                if current_domain:
                    current_row = write_rows(current_ws, [["Domain", current_domain]], current_row, widths_by_sheet[ws_name])
                    current_row += 1

                current_row = write_rows(current_ws, table, current_row, widths_by_sheet[ws_name])
                current_row += 1
                continue

            # If we are in a control sheet context, append subsequent detail tables
            if current_ws is not None:
                current_row = write_rows(current_ws, table, current_row, widths_by_sheet[current_ws.title])
                current_row += 1
            else:
                # Generic table gets its own sheet
                base = "Table"
                ws_name = safe_sheet_name(base, sheet_names)
                ws = wb.create_sheet(title=ws_name)
                sheet_names.add(ws_name)
                widths_by_sheet[ws_name] = {}
                r = 1
                if current_domain:
                    r = write_rows(ws, [["Domain", current_domain]], r, widths_by_sheet[ws_name])
                    r += 1
                write_rows(ws, table, r, widths_by_sheet[ws_name])
            continue

        # Reset control context when encountering a clear separator between sections
        if not line.strip():
            i += 1
            continue

        # Non-table, non-heading content — just advance
        i += 1

    # Apply column widths
    for ws in wb.worksheets:
        widths = widths_by_sheet.get(ws.title, {})
        for col_idx, width in widths.items():
            ws.column_dimensions[get_column_letter(col_idx)].width = width

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    wb.save(args.output)


if __name__ == "__main__":
    main()


