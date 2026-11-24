from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

non_medical = [
    ("111301", "Lahore Business School", "Faculty of Management Sciences"),
    ("111302", "Lahore School of Aviation", "Faculty of Management Sciences"),
    ("111303", "Department of Information Management", "Faculty of Management Sciences"),
    ("111701", "Department of Economics", "Faculty of Management Sciences"),
    ("111305", "Lahore School of Behavioural Sciences", "Faculty of Social Sciences"),
    ("111702", "Department of Education", "Faculty of Social Sciences"),
    ("111705", "School of Integrated Social Science", "Faculty of Social Sciences"),
    ("111703", "Department of Islamic Studies", "Faculty of Social Sciences"),
    ("111708", "Department of Criminology", "Faculty of Social Sciences"),
    ("111707", "Department of Sociology", "Faculty of Social Sciences"),
    ("111501", "M.A Raoof College of Law", "Faculty of Law"),
    ("111402", "School of Creative Arts", "Faculty of Arts and Architecture"),
    ("111406", "School of Fashion and Textile", "Faculty of Arts and Architecture"),
    ("111401", "School of Architecture", "Faculty of Arts and Architecture"),
    ("111601", "Dept. of English Language and Literature", "Faculty of Languages and Literature"),
    ("111602", "Department of Urdu", "Faculty of Languages and Literature"),
    ("111801", "Department of Electrical Engineering", "Faculty of Engineering and Technology"),
    ("111802", "Department of Civil Engineering", "Faculty of Engineering and Technology"),
    ("111803", "Department of Mechanical Engineering", "Faculty of Engineering and Technology"),
    ("111804", "Department of Technology", "Faculty of Engineering and Technology"),
    ("111806", "Department of Computer Engineering", "Faculty of Engineering and Technology"),
    ("112001", "Department of Computer Sciences & IT", "Faculty of Information Technology"),
    ("112002", "Department of Software Engineering", "Faculty of Information Technology"),
    ("112003", "Department of Intelligent Systems", "Faculty of Information Technology"),
    ("112004", "Department of Artificial Intelligence", "Faculty of Information Technology"),
]

medical = [
    ("111902", "Department of Physics", "Faculty of Sciences"),
    ("111901", "Department of Mathematics and Statistics", "Faculty of Sciences"),
    ("111903", "Institute of Molecular Biology & Biotech (IMBB-CRiMM)", "Faculty of Sciences"),
    ("111904", "Center for Research in Molecular Medicine", "Faculty of Sciences"),
    ("111905", "Department of Chemistry", "Faculty of Sciences"),
    ("111906", "Department of Environmental Sciences", "Faculty of Sciences"),
    ("112101", "University College of Medicine", "Faculty of Medicine and Dentistry"),
    ("112102", "University College of Dentistry", "Faculty of Medicine and Dentistry"),
    ("112103", "Department of Medical Education", "Faculty of Medicine and Dentistry"),
    ("112104", "Health Professional Development & Lifelong", "Faculty of Medicine and Dentistry"),
    ("112301", "Department of Pharmacy", "Faculty of Pharmacy"),
    ("111907", "School of Pain & Regenerative Medicine", "Faculty of Allied Health Sciences"),
    ("112201", "Dept of Health Professional Technologies", "Faculty of Allied Health Sciences"),
    ("112202", "University Inst of Diet & Nutri Sciences", "Faculty of Allied Health Sciences"),
    ("112203", "Department of Physical Education & SS", "Faculty of Allied Health Sciences"),
    ("112204", "Lahore School of Nursing", "Faculty of Allied Health Sciences"),
    ("112205", "University Institute of Medical Lab Tech", "Faculty of Allied Health Sciences"),
    ("112206", "Dept of Radiological Sciences and MIT", "Faculty of Allied Health Sciences"),
    ("112207", "University Institute of Physical Therapy", "Faculty of Allied Health Sciences"),
    ("112208", "University Institute of Public Health", "Faculty of Allied Health Sciences"),
    ("112209", "Department of Optometry & Vision Science", "Faculty of Allied Health Sciences"),
    ("112210", "Uni. Inst. of Food Science & Technology", "Faculty of Allied Health Sciences"),
    ("112211", "Department of Rehabilitation Sciences", "Faculty of Allied Health Sciences"),
    ("112212", "Dept. of Emerging Allied Health Tech.", "Faculty of Allied Health Sciences"),
    ("112214", "Department of Audiology", "Faculty of Allied Health Sciences"),
]

header_fill = PatternFill("solid", fgColor="1F4E78")
header_font = Font(bold=True, color="FFFFFF", size=12)
thin = Side(style="thin", color="B0B0B0")
border = Border(left=thin, right=thin, top=thin, bottom=thin)


def build_workbook(data, sheet_name, output):
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name

    ws.append(["Code", "Department", "Faculty"])
    for col in range(1, 4):
        cell = ws.cell(row=1, column=col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    for code, dept, faculty in data:
        ws.append([code, dept, faculty])

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=3):
        for cell in row:
            cell.border = border
            cell.alignment = Alignment(vertical="center")

    for i, w in enumerate([12, 50, 40], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:C{ws.max_row}"

    wb.save(output)
    print(f"Saved {len(data)} rows to {output}")


build_workbook(non_medical, "Non-Medical Departments", r"D:\UOL\Ethical-Approval\non-medical-departments.xlsx")
build_workbook(medical, "Medical Departments", r"D:\UOL\Ethical-Approval\medical-departments.xlsx")
