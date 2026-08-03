"""Parse uklang Excel price list into JSON for seeding."""
import json, re, sys
from pathlib import Path
import xlrd

XLS = Path(__file__).parent.parent / "data" / "current_price.xls"
OUT = Path(__file__).parent.parent / "data" / "prices.json"

VEHICLE_MAP = {
    "รถเก๋ง(เอเชีย)": "sedan_asia",
    "รถเก๋ง(ยุโรป)": "sedan_eu",
    "รถกระบะ": "pickup",
    "รถตู้": "van",
}

def clean_num(v):
    if v is None or v == "" or v == 0:
        return None
    if isinstance(v, (int, float)):
        return float(v) if v > 0 else None
    s = str(v).strip()
    if not s: return None
    # handle "*3400" annotations
    m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", ""))
    return float(m.group(1)) if m else None


def clean_text(v):
    if v is None: return ""
    return str(v).strip()


def parse_sheet(wb, sheet_name, vehicle_code):
    sheet = wb.sheet_by_name(sheet_name)
    rows = []
    current_part = ""
    current_part_extra = ""  # multi-line part names (e.g. "หน้า-หลัง" continuation)

    # Skip header rows 0, 1
    for r in range(2, sheet.nrows):
        part_cell = clean_text(sheet.cell_value(r, 0))
        size = clean_text(sheet.cell_value(r, 1))
        light = clean_num(sheet.cell_value(r, 2))
        medium = clean_num(sheet.cell_value(r, 3))
        heavy = clean_num(sheet.cell_value(r, 4))
        replace = clean_num(sheet.cell_value(r, 5))
        note = clean_text(sheet.cell_value(r, 6)).replace("\n", " ").replace("0.0", "").strip()

        # New part name starts a group
        if part_cell:
            # Could be a continuation line if size is empty and no prices (skip)
            if size in ("A", "B", "C") or any([light, medium, heavy, replace]):
                current_part = part_cell
                current_part_extra = ""
            else:
                # likely a multi-line part name continuation (e.g. "หน้า-หลัง")
                if current_part:
                    current_part_extra = (current_part_extra + " " + part_cell).strip()
                else:
                    current_part = part_cell
                continue

        # Skip rows with no size and no data
        if size not in ("A", "B", "C"):
            continue

        # Skip if all prices null
        if not any([light, medium, heavy, replace]):
            continue

        full_part = (current_part + (" " + current_part_extra if current_part_extra else "")).strip()

        rows.append({
            "vehicle_type": vehicle_code,
            "part_th": full_part,
            "size": size,  # A=small, B=medium, C=large
            "minor": light,      # ซ่อมเบา
            "moderate": medium,  # ซ่อมกลาง
            "severe": heavy,     # ซ่อมหนัก
            "replace": replace,  # เปลี่ยน
            "note": note or None,
        })

    return rows


def main():
    wb = xlrd.open_workbook(str(XLS))
    all_rows = []
    for sheet_name, code in VEHICLE_MAP.items():
        rows = parse_sheet(wb, sheet_name, code)
        print(f"  {sheet_name} -> {code}: {len(rows)} price entries", file=sys.stderr)
        all_rows.extend(rows)

    # Deduplicate distinct parts
    parts = sorted({r["part_th"] for r in all_rows})
    print(f"\nTotal entries: {len(all_rows)}", file=sys.stderr)
    print(f"Distinct parts: {len(parts)}", file=sys.stderr)
    print(f"\nFirst 30 parts:", file=sys.stderr)
    for p in parts[:30]:
        print(f"  - {p}", file=sys.stderr)

    OUT.write_text(json.dumps(all_rows, ensure_ascii=False, indent=2))
    print(f"\nWrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
