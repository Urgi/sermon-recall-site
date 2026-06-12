export type AdminChartTheme = {
  gridStroke: string;
  tickFill: string;
  legendColor: string;
  tooltip: {
    backgroundColor: string;
    border: string;
    labelColor: string;
  };
  barOpened: string;
  barCompleted: string;
};

export function getAdminChartTheme(resolved: 'dark' | 'light'): AdminChartTheme {
  if (resolved === 'light') {
    return {
      gridStroke: '#e2e8f0',
      tickFill: '#64748b',
      legendColor: '#64748b',
      tooltip: {
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        labelColor: '#0f172a',
      },
      barOpened: '#38bdf8',
      barCompleted: '#4ade80',
    };
  }
  return {
    gridStroke: '#1e293b',
    tickFill: '#94a3b8',
    legendColor: '#94a3b8',
    tooltip: {
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      labelColor: '#e2e8f0',
    },
    barOpened: '#7dd3fc',
    barCompleted: '#86efac',
  };
}
