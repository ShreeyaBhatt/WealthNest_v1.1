"""
api/views/pdf_report.py — POST /api/pdf-report/

Takes portfolio data Node already gathered from MongoDB and turns it
into a downloadable PDF using ReportLab. Returns raw PDF bytes
(a plain Django HttpResponse, not a DRF Response) — a PDF isn't JSON,
so there's nothing for DRF's usual renderers to do here.
"""

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view


def build_pdf(family_name, totals, investments):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph('WealthNest Portfolio Report', styles['Title']))
    elements.append(Paragraph(f'Family: {family_name}', styles['Normal']))
    elements.append(Paragraph(f"Generated: {timezone.now().strftime('%d %b %Y, %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 0.5 * cm))

    # ── Summary table ──
    summary_rows = [
        ['Total Invested', f"₹{totals.get('totalInvested', 0):,.0f}"],
        ['Current Value', f"₹{totals.get('totalValue', 0):,.0f}"],
        ['Total Return', f"₹{totals.get('totalReturn', 0):,.0f} ({totals.get('returnPercentage', 0)}%)"],
        ['Number of Investments', str(totals.get('investmentCount', len(investments)))],
    ]
    summary_table = Table(summary_rows, colWidths=[7 * cm, 7 * cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eff6ff')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.8 * cm))

    # ── Investments table ──
    elements.append(Paragraph('Investments', styles['Heading2']))
    header = ['Name', 'Category', 'Owner', 'Invested', 'Current Value']
    rows = [header] + [
        [
            inv.get('name', ''),
            inv.get('category', ''),
            inv.get('owner', ''),
            f"₹{inv.get('amount', 0):,.0f}",
            f"₹{inv.get('currentValue', 0):,.0f}",
        ]
        for inv in investments
    ]
    investments_table = Table(rows, colWidths=[4 * cm, 3 * cm, 3 * cm, 3 * cm, 3 * cm])
    investments_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    elements.append(investments_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer


@api_view(['POST'])
def pdf_report(request):
    family_name = request.data.get('familyName', 'My Family')
    totals = request.data.get('totals', {})
    investments = request.data.get('investments', [])

    pdf_buffer = build_pdf(family_name, totals, investments)

    response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="wealthnest-portfolio-report.pdf"'
    return response
