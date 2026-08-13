/**
 * src/pages/ReportsPage.jsx
 *
 * Downloading a file from an axios blob response isn't a plain link
 * click — the browser needs a temporary object URL pointing at the
 * blob, and a temporary <a download> to actually trigger the "Save
 * File" behavior. We clean both up immediately after.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiCheck } from 'react-icons/fi';

import { downloadPortfolioReport } from '../api/reports';

// What the PDF actually contains — verified against
// django_ai/api/views/pdf_report.py's build_pdf() sections, so this list
// stays honest rather than describing features that don't exist.
const REPORT_CONTENTS = [
  'Portfolio summary (total invested, current value, return)',
  'Allocation by category',
  'Full investment details, per holding',
];

// responseType: 'blob' applies to error responses too, so a failed
// request's err.response.data arrives as a Blob instead of parsed JSON —
// this reads it back out as text so the real backend message shows up.
const blobErrorMessage = async (err) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || 'Could not generate report';
    } catch {
      return 'Could not generate report';
    }
  }
  return data?.message || 'Could not generate report';
};

const ReportsPage = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadPortfolioReport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wealthnest-portfolio-report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(await blobErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-lg animate-fade-in">
      <h1 className="section-title mb-6">Reports</h1>

      <div className="card text-center">
        <div className="relative w-16 h-16 mx-auto mb-4 rounded-xl bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center">
          <FiFileText size={28} className="text-gold-600 dark:text-gold-400" />
          {/* A subtle "folded corner" accent — pure CSS, no image asset */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-gold-400 rounded-bl-md" />
        </div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Portfolio Report (PDF)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Generated on the fly with ReportLab, straight from your family's live portfolio data.
        </p>

        <ul className="text-sm text-left text-gray-600 dark:text-gray-300 space-y-2 mb-6 max-w-xs mx-auto">
          {REPORT_CONTENTS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <FiCheck className="text-gain-600 dark:text-gain-400 mt-0.5 shrink-0" size={16} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button className="btn-gold flex items-center gap-2 mx-auto" onClick={handleDownload} disabled={downloading}>
          <FiDownload /> {downloading ? 'Generating...' : 'Download PDF Report'}
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
