import os
import openpyxl

def reorder_sheets_front():
    excel_path = "/Users/arthur/Documents/Customer/H Tech/Labor Motor/Labor_Motor_Car_Brands.xlsx"
    
    if not os.path.exists(excel_path):
        print("ERROR: Excel file not found at", excel_path)
        return

    wb = openpyxl.load_workbook(excel_path)

    # Desired sheet order
    desired_order = [
        "Audi", "BENZ", "BMW", "MINI Cooper",
        "BYD", "Deepal S07", "FORD", "GMW", "Hyundai",
        "ISUZU", "Lexus", "MG", "Mazda", "Mitsu",
        "NISSAN", "Ora Goodcat", "Porsche", "SUBARU",
        "Suzuki", "Tesla", "Volvo"
    ]

    # Map current sheet objects by title
    sheet_map = {sheet.title: sheet for sheet in wb.worksheets}
    
    # Reorder _sheets list
    new_sheets = []
    for name in desired_order:
        if name in sheet_map:
            new_sheets.append(sheet_map[name])

    # Append any remaining sheets not in desired_order
    for sheet in wb.worksheets:
        if sheet not in new_sheets:
            new_sheets.append(sheet)

    wb._sheets = new_sheets
    wb.save(excel_path)
    print("SUCCESS: Reordered sheets in workbook at", excel_path)

if __name__ == "__main__":
    reorder_sheets_front()
