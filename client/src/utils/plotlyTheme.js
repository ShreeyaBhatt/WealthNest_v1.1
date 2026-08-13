/**
 * src/utils/plotlyTheme.js — Makes Plotly charts respect light/dark mode
 *
 * WHY does this need to exist at all?
 * Plotly paints its own canvas/SVG background via `layout` props passed
 * to <Plot> — it has no idea the rest of the page is in dark mode, since
 * that's controlled by a `dark` class on <html> (Tailwind's darkMode:
 * 'class'), which is pure CSS. Without this, a chart in dark mode would
 * render on Plotly's default solid white background: a jarring white
 * box sitting in the middle of an otherwise-dark UI.
 *
 * Usage: spread the result into every <Plot layout={{ ...here, ... }}>,
 * reading `theme` the same way Navbar.jsx already does
 * (useSelector(selectTheme) from redux/slices/uiSlice).
 */

// Matches the new navy/gold palette (tailwind.config.js) — used for trace
// colors that don't specify their own (e.g. the category pie chart's slices).
const CHART_COLORWAY = ['#d4af37', '#2c4d70', '#b45309', '#5483ac', '#82a8ca', '#dfbd68'];

export const getPlotlyThemeLayout = (theme) => ({
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: theme === 'dark' ? '#e2e8f0' : '#1e293b', family: 'Inter, system-ui, sans-serif' },
  colorway: CHART_COLORWAY,
});
