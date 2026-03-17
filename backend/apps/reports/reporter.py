"""
Report data-fetching and file-generation engine for MIRA GRC.

Supports PDF (WeasyPrint), Excel (openpyxl), and CSV output.
Each module is mapped to a queryset factory and serializer that
turns rows into plain dicts the renderers can consume.
"""
import csv
import importlib
import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Module registry
# ──────────────────────────────────────────────────────────────────────────────

_MODULE_CONFIG: dict[str, dict] = {
    "risks": {
        "model_path": ("apps.risks.models", "Risk"),
        "serializer_path": ("apps.risks.serializers", "RiskSerializer"),
        "select_related": ["category", "owner"],
    },
    "controls": {
        "model_path": ("apps.controls.models", "Control"),
        "serializer_path": ("apps.controls.serializers", "ControlSerializer"),
        "select_related": ["category", "owner"],
    },
    "incidents": {
        "model_path": ("apps.incidents.models", "Incident"),
        "serializer_path": ("apps.incidents.serializers", "IncidentSerializer"),
        "select_related": ["category", "owner"],
    },
    "compliance": {
        "model_path": ("apps.compliance.models", "ComplianceProgram"),
        "serializer_path": ("apps.compliance.serializers", "ComplianceProgramSerializer"),
        "select_related": ["framework", "owner"],
    },
    "policies": {
        "model_path": ("apps.policies.models", "Policy"),
        "serializer_path": ("apps.policies.serializers", "PolicySerializer"),
        "select_related": ["category", "owner"],
    },
    "assets": {
        "model_path": ("apps.assets.models", "Asset"),
        "serializer_path": ("apps.assets.serializers", "AssetSerializer"),
        "select_related": ["category", "owner", "business_unit"],
    },
    "third_parties": {
        "model_path": ("apps.third_parties.models", "ThirdParty"),
        "serializer_path": ("apps.third_parties.serializers", "ThirdPartySerializer"),
        "select_related": ["owner"],
    },
    "projects": {
        "model_path": ("apps.projects.models", "Project"),
        "serializer_path": ("apps.projects.serializers", "ProjectSerializer"),
        "select_related": ["owner"],
    },
    "exceptions": {
        "model_path": ("apps.exceptions.models", "Exception"),
        "serializer_path": ("apps.exceptions.serializers", "ExceptionSerializer"),
        "select_related": ["owner"],
    },
    "awareness": {
        "model_path": ("apps.awareness.models", "AwarenessProgram"),
        "serializer_path": ("apps.awareness.serializers", "AwarenessProgramSerializer"),
        "select_related": [],
    },
}


def _import(path: tuple[str, str]):
    mod = importlib.import_module(path[0])
    return getattr(mod, path[1])


def get_module_data(
    module: str,
    filters: dict,
    fields: list[str],
    ordering: str = "",
) -> tuple[list[str], list[dict]]:
    """
    Return (field_names, rows) for the given module.

    field_names is the ordered list of columns.
    rows is a list of dicts, one per object.
    """
    cfg = _MODULE_CONFIG.get(module)
    if cfg is None:
        logger.warning("Unknown report module: %s", module)
        return [], []

    ModelClass = _import(cfg["model_path"])
    SerializerClass = _import(cfg["serializer_path"])

    qs = ModelClass.objects.all()

    # Apply select_related to avoid N+1
    if cfg.get("select_related"):
        qs = qs.select_related(*cfg["select_related"])

    # Apply filters (simple kwarg filters only)
    if filters:
        try:
            qs = qs.filter(**filters)
        except Exception:
            logger.exception("Failed to apply filters %s to module %s", filters, module)

    # Apply ordering
    if ordering:
        qs = qs.order_by(*ordering.split(","))

    serializer = SerializerClass(qs, many=True)
    all_rows: list[dict] = [dict(r) for r in serializer.data]

    if not all_rows:
        if fields:
            return fields, []
        return [], []

    # Determine columns
    all_keys = list(all_rows[0].keys())
    col_names = fields if fields else all_keys

    # Filter each row to selected columns only, convert values to str
    result_rows = []
    for row in all_rows:
        result_rows.append({k: _to_str(row.get(k)) for k in col_names})

    return col_names, result_rows


def _to_str(val) -> str:
    if val is None:
        return ""
    if isinstance(val, bool):
        return "Yes" if val else "No"
    if isinstance(val, (list, dict)):
        return str(val)
    return str(val)


# ──────────────────────────────────────────────────────────────────────────────
# PDF generation (WeasyPrint)
# ──────────────────────────────────────────────────────────────────────────────

_PDF_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 24px; }}
  h1 {{ font-size: 18px; font-weight: 700; margin-bottom: 4px; }}
  .meta {{ font-size: 9px; color: #6b7280; margin-bottom: 16px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  thead tr {{ background: #1e3a5f; color: #fff; }}
  thead th {{ padding: 8px 10px; text-align: left; font-size: 9px; white-space: nowrap; }}
  tbody tr:nth-child(even) {{ background: #f8fafc; }}
  tbody tr:hover {{ background: #eff6ff; }}
  td {{ padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }}
  .footer {{ margin-top: 16px; font-size: 8px; color: #9ca3af; text-align: right; }}
</style>
</head>
<body>
  <h1>{title}</h1>
  <div class="meta">Generated {date} · {count} record(s)</div>
  <table>
    <thead>
      <tr>{headers}</tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
  <div class="footer">MIRA GRC Platform</div>
</body>
</html>"""


def generate_pdf_bytes(title: str, fields: list[str], rows: list[dict]) -> bytes:
    """Generate a styled PDF using WeasyPrint."""
    from weasyprint import HTML  # type: ignore

    headers_html = "".join(
        f"<th>{col.replace('_', ' ').title()}</th>" for col in fields
    )
    rows_html = ""
    for row in rows:
        cells = "".join(f"<td>{row.get(f, '')}</td>" for f in fields)
        rows_html += f"<tr>{cells}</tr>\n"

    html_str = _PDF_TEMPLATE.format(
        title=title,
        date=datetime.now().strftime("%Y-%m-%d %H:%M UTC"),
        count=len(rows),
        headers=headers_html,
        rows=rows_html,
    )
    return HTML(string=html_str).write_pdf()


# ──────────────────────────────────────────────────────────────────────────────
# Excel generation (openpyxl)
# ──────────────────────────────────────────────────────────────────────────────

def generate_excel_bytes(title: str, fields: list[str], rows: list[dict]) -> bytes:
    """Generate a styled Excel workbook using openpyxl."""
    from openpyxl import Workbook  # type: ignore
    from openpyxl.styles import Alignment, Font, PatternFill  # type: ignore

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel limit

    HEADER_FILL = PatternFill("solid", fgColor="1E3A5F")
    HEADER_FONT = Font(bold=True, color="FFFFFF", size=10)

    # Write headers
    for col_idx, field in enumerate(fields, start=1):
        cell = ws.cell(row=1, column=col_idx, value=field.replace("_", " ").title())
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="left")

    # Write data rows
    for row_idx, row in enumerate(rows, start=2):
        for col_idx, field in enumerate(fields, start=1):
            ws.cell(row=row_idx, column=col_idx, value=row.get(field, ""))

    # Auto-size columns (approximate)
    for col in ws.columns:
        max_len = max(
            (len(str(cell.value)) if cell.value else 0) for cell in col
        )
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


# ──────────────────────────────────────────────────────────────────────────────
# CSV generation
# ──────────────────────────────────────────────────────────────────────────────

def generate_csv_bytes(fields: list[str], rows: list[dict]) -> bytes:
    """Generate a UTF-8 CSV file."""
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=fields,
        extrasaction="ignore",
        lineterminator="\r\n",
    )
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")
