/**
 * src/controllers/report.controller.js — GET /api/reports/portfolio
 *
 * Gathers the caller's family portfolio, sends it to Django's
 * /api/pdf-report/ endpoint (ReportLab — see
 * django_ai/api/views/pdf_report.py), and streams the generated PDF
 * bytes straight back to the browser as a file download.
 */

const axios = require('axios');
const Investment = require('../models/Investment.model');
const Family = require('../models/Family.model');
const { AppError } = require('../middleware/errorHandler');

const getPortfolioReport = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const [family, investments] = await Promise.all([
    Family.findById(req.user.family),
    Investment.find({ family: req.user.family, isActive: true }).populate('owner', 'name'),
  ]);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalReturn = totalValue - totalInvested;

  const payload = {
    familyName: family?.name || 'My Family',
    totals: {
      totalInvested,
      totalValue,
      totalReturn,
      returnPercentage: totalInvested === 0 ? 0 : Number(((totalReturn / totalInvested) * 100).toFixed(2)),
      investmentCount: investments.length,
    },
    investments: investments.map((inv) => ({
      name: inv.name,
      category: inv.category,
      owner: inv.owner?.name,
      amount: inv.amount,
      currentValue: inv.currentValue,
    })),
  };

  // responseType: 'arraybuffer' — without this, axios would try to
  // decode the PDF bytes as UTF-8 text and corrupt the file.
  const djangoResponse = await axios.post(`${process.env.DJANGO_URL}/api/pdf-report/`, payload, {
    responseType: 'arraybuffer',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="wealthnest-portfolio-report.pdf"');
  res.send(djangoResponse.data);
};

module.exports = { getPortfolioReport };
