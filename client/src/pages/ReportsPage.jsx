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
import { FiDownload } from 'react-icons/fi';

import { downloadPortfolioReport } from '../api/reports';

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

      <div className="card">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Portfolio Report (PDF)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          A summary of your family's investments, generated on the fly with ReportLab.
        </p>
        <button className="btn-primary flex items-center gap-2" onClick={handleDownload} disabled={downloading}>
          <FiDownload /> {downloading ? 'Generating...' : 'Download PDF Report'}
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
