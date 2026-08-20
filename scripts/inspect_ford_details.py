import pdfplumber
import os
import re

ford_dir = '/Users/arthur/Documents/Customer/H Tech/Labor Motor/FORD'

files = [
    "All New Ford Ranger.pdf",
    "Ford Everest.pdf",
    "Ford Ranger.pdf",
    "Next Gen Ford Everest.pdf"
]

for f in files:
    path = os.path.join(ford_dir, f)
    if not os.path.exists(path):
        print(f"File not found: {f}")
        continue
    
    with pdfplumber.open(path) as pdf:
        print(f"\n==================== {f} ({len(pdf.pages)} pages) ====================")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            header_line = ""
            for line in lines[:5]:
                if "Menu Pricing" in line or "Truck" in line or "SUV" in line or "Cab" in line:
                    header_line = line
                    break
            
            tables = page.extract_tables()
            print(f"Page {i+1:2d} | Header: {header_line[:60]} | Tables count: {len(tables)}")
