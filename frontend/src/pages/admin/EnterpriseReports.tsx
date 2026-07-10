import { useState, useMemo } from 'react';
import { Download, RefreshCw, Activity, Info, Minus, X, Tag } from 'lucide-react';

interface EnterpriseReportsProps {
  orders: any[];
  products: any[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export default function EnterpriseReports({ orders, products, showToast }: EnterpriseReportsProps) {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'returns'>('sales');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [compiledData, setCompiledData] = useState<any[]>([]);

  // NEW: AdminLTE Chart States (Interactivity: Collapse and Visibility)
  const [collapsedRevenueGrowthTrend, setCollapsedRevenueGrowthTrend] = useState(false);
  const [visibleRevenueGrowthTrend, setVisibleRevenueGrowthTrend] = useState(true);
  const [collapsedTopCategoryShare, setCollapsedTopCategoryShare] = useState(false);
  const [visibleTopCategoryShare, setVisibleTopCategoryShare] = useState(true);

  // 1. Calculate General Aggregates
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalOrders = 0;
    let totalQty = 0;
    let cancellations = 0;
    
    orders.forEach(o => {
      const isPlacedBetween = o.created_at?.split('T')[0] >= dateFrom && o.created_at?.split('T')[0] <= dateTo;
      if (isPlacedBetween) {
        totalOrders++;
        if (o.order_status !== 'cancelled') {
          totalSales += o.total_amount;
        } else {
          cancellations++;
        }
        // Count total qty
        if (o.items) {
          o.items.forEach((it: any) => {
            totalQty += it.quantity || 0;
          });
        }
      }
    });

    const avgOrder = totalOrders > 0 ? (totalSales / (totalOrders - cancellations || 1)) : 0;
    const cancelRate = totalOrders > 0 ? (cancellations / totalOrders) * 100 : 0;

    return {
      totalSales,
      totalOrders,
      totalQty,
      avgOrder,
      cancelRate
    };
  }, [orders, dateFrom, dateTo]);

  // 2. Generate Report Dataset
  const handleCompileReport = () => {
    setLoading(true);
    try {
      if (reportType === 'sales') {
        // Daily Sales Grouping
        const groups: { [key: string]: { ordersCount: number; grossRevenue: number; netRevenue: number; itemsCount: number } } = {};
        orders.forEach(o => {
          const dateStr = o.created_at?.split('T')[0] || 'Unknown';
          if (dateStr >= dateFrom && dateStr <= dateTo) {
            if (!groups[dateStr]) {
              groups[dateStr] = { ordersCount: 0, grossRevenue: 0, netRevenue: 0, itemsCount: 0 };
            }
            groups[dateStr].ordersCount++;
            groups[dateStr].grossRevenue += o.total_amount;
            if (o.order_status !== 'cancelled') {
              groups[dateStr].netRevenue += o.total_amount;
            }
            if (o.items) {
              o.items.forEach((it: any) => {
                groups[dateStr].itemsCount += it.quantity || 0;
              });
            }
          }
        });
        const arr = Object.entries(groups).map(([date, g]) => ({
          Date: date,
          Orders: g.ordersCount,
          'Gross (₹)': g.grossRevenue.toFixed(2),
          'Net Sales (₹)': g.netRevenue.toFixed(2),
          'Items Shipped': g.itemsCount
        })).sort((a, b) => a.Date.localeCompare(b.Date));
        setCompiledData(arr);
        showToast('success', 'Report Generated', `Compiled sales report with ${arr.length} daily logs.`);
      } else if (reportType === 'inventory') {
        // Product stock breakdown
        const arr = products.map(p => ({
          SKU: p.sku,
          Name: p.name,
          Category: p.category,
          'Stock Count': p.stock,
          'Price (₹)': (p.price / 100).toFixed(2),
          'Asset Value (₹)': ((p.price * p.stock) / 100).toFixed(2),
          Status: p.stock === 0 ? 'OUT_OF_STOCK' : p.stock < 5 ? 'LOW_STOCK' : 'HEALTHY'
        }));
        setCompiledData(arr);
        showToast('success', 'Report Generated', `Compiled stock assets with ${arr.length} styles entries.`);
      } else {
        // Return Requests Log
        setCompiledData([]);
        showToast('info', 'Report Generated', 'Exchanges analytics loaded successfully.');
      }
    } catch {
      showToast('error', 'Compilation Failure', 'Unable to calculate reporting bounds.');
    } finally {
      setLoading(false);
    }
  };

  // 3. SVG Line Chart: Revenue Trend (Today, YTD)
  const lineChartData = useMemo(() => {
    const dailyData: { [key: string]: number } = {};
    orders.forEach(o => {
      const dateStr = o.created_at?.split('T')[0];
      if (dateStr && dateStr >= dateFrom && dateStr <= dateTo && o.order_status !== 'cancelled') {
        dailyData[dateStr] = (dailyData[dateStr] || 0) + o.total_amount;
      }
    });

    const dates = Object.keys(dailyData).sort();
    if (dates.length === 0) return { path: '', points: [], area: '' };

    const maxRev = Math.max(...Object.values(dailyData), 100);
    const width = 500;
    const height = 140;
    const padding = 20;

    const points = dates.map((d, i) => {
      const x = padding + (i / (dates.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (dailyData[d] / maxRev) * (height - 2 * padding);
      return { x, y, date: d, value: dailyData[d] };
    });

    const path = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const area = points.length > 0 
      ? `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : '';

    return { path, points, area };
  }, [orders, dateFrom, dateTo]);

  // 4. SVG Bar Chart: Category Share of inventory
  const categoryBarData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categoriesList = Object.keys(counts).slice(0, 5); // top 5
    if (categoriesList.length === 0) return [];

    const maxCount = Math.max(...Object.values(counts), 1);
    const chartHeight = 110;
    const barWidth = 35;
    const gap = 30;

    return categoriesList.map((cat, i) => {
      const count = counts[cat];
      const height = (count / maxCount) * chartHeight;
      const x = 40 + i * (barWidth + gap);
      const y = 130 - height;
      return { x, y, height, label: cat, value: count };
    });
  }, [products]);

  // CSV Exporter
  const exportCsv = () => {
    if (compiledData.length === 0) return;
    const headers = Object.keys(compiledData[0]);
    const csvContent = [
      headers.join(','),
      ...compiledData.map(row => 
        headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `heelsup_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'CSV Saved', `Successfully exported compiled report.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Parameters Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-neutral-200/80 p-5 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-neutral-900 font-display italic">Enterprise Reports</h2>
          <p className="text-[10px] text-neutral-500 font-medium">Export sales, stock value and cancelled logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={reportType}
            onChange={e => {
              setReportType(e.target.value as any);
              setCompiledData([]);
            }}
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none"
          >
            <option value="sales">Sales Volume Report</option>
            <option value="inventory">Inventory Asset Summary</option>
          </select>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-neutral-900"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-neutral-900"
            />
          </div>
          <button
            onClick={handleCompileReport}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-100 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Gross Revenues</span>
          <span className="block text-base font-bold font-mono text-neutral-900 mt-1">₹{stats.totalSales.toLocaleString('en-IN')}</span>
          <span className="text-[7px] text-emerald-500 font-bold uppercase mt-1 block">Active sales</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Orders count</span>
          <span className="block text-base font-bold font-mono text-neutral-900 mt-1">{stats.totalOrders} orders</span>
          <span className="text-[7px] text-neutral-500 font-semibold mt-1 block">YTD transactions</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Average Order</span>
          <span className="block text-base font-bold font-mono text-neutral-700 mt-1">₹{stats.avgOrder.toFixed(2)}</span>
          <span className="text-[7px] text-neutral-700 font-semibold mt-1 block">Ticket size</span>
        </div>
        <div className="bg-white border border-neutral-200/80 p-4 rounded-xl">
          <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-wider">Cancellation Rate</span>
          <span className="block text-base font-bold font-mono text-rose-500 mt-1">{stats.cancelRate.toFixed(1)}%</span>
          <span className="text-[7px] text-rose-500/80 font-semibold mt-1 block">Bounced orders</span>
        </div>
      </div>

      {/* Charts Visualization Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales trend SVG area chart */}
        <div className={visibleRevenueGrowthTrend ? "lg:col-span-8 card card-outline card-warning bg-white border border-neutral-200/80 border-t-[3px] border-t-amber-500 rounded-lg shadow-md overflow-hidden flex flex-col" : "hidden"}>
          <div className="card-header border-b border-neutral-200/80 px-4 py-2.5 flex justify-between items-center bg-neutral-50">
            <h3 className="card-title text-[9px] font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Activity className="w-4 h-4 text-amber-500" />
              Revenue Growth Trend (Inclusive GST)
            </h3>
            <div className="card-tools flex items-center gap-2">
              <button 
                onClick={() => setCollapsedRevenueGrowthTrend(!collapsedRevenueGrowthTrend)}
                className="text-neutral-500 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded transition-colors"
                title="Collapse"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setVisibleRevenueGrowthTrend(false)}
                className="text-neutral-500 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className={`card-body p-5 space-y-4 ${collapsedRevenueGrowthTrend ? 'hidden' : ''}`}>
            <div className="h-44 relative bg-neutral-50 border border-neutral-200 rounded-xl p-3">
              {lineChartData.points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-500">No sales transactions in target timeframe.</div>
              ) : (
                <svg viewBox="0 0 500 140" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#171717" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#171717" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>
                  {/* Horizontal Grid lines */}
                  <line x1="10" y1="20" x2="490" y2="20" stroke="#e5e5e5" strokeDasharray="3" />
                  <line x1="10" y1="60" x2="490" y2="60" stroke="#e5e5e5" strokeDasharray="3" />
                  <line x1="10" y1="100" x2="490" y2="100" stroke="#e5e5e5" strokeDasharray="3" />
                  <line x1="10" y1="120" x2="490" y2="120" stroke="#e5e5e5" />
                  
                  {/* Area Gradient fill */}
                  <path d={lineChartData.area} fill="url(#glow)" />
                  {/* Stroke line path */}
                  <path d={lineChartData.path} fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Dots */}
                  {lineChartData.points.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3"
                      fill="white"
                      stroke="#171717"
                      strokeWidth="1.5"
                      className="cursor-pointer hover:r-4 transition-all"
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Category distribution bar chart */}
        <div className={visibleTopCategoryShare ? "lg:col-span-4 card card-outline card-success bg-white border border-neutral-200/80 border-t-[3px] border-t-emerald-500 rounded-lg shadow-md overflow-hidden flex flex-col" : "hidden"}>
          <div className="card-header border-b border-neutral-200/80 px-4 py-2.5 flex justify-between items-center bg-neutral-50">
            <h3 className="card-title text-[9px] font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Tag className="w-4 h-4 text-emerald-500" />
              Top Category Share
            </h3>
            <div className="card-tools flex items-center gap-2">
              <button 
                onClick={() => setCollapsedTopCategoryShare(!collapsedTopCategoryShare)}
                className="text-neutral-500 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded transition-colors"
                title="Collapse"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setVisibleTopCategoryShare(false)}
                className="text-neutral-500 hover:text-neutral-900 p-1 hover:bg-neutral-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className={`card-body p-5 space-y-4 ${collapsedTopCategoryShare ? 'hidden' : ''}`}>
            <div className="h-44 bg-neutral-50 border border-neutral-200 rounded-xl p-3 relative">
              {categoryBarData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-500">No product inventory cataloged.</div>
              ) : (
                <svg viewBox="0 0 320 140" className="w-full h-full overflow-visible">
                  {categoryBarData.map((bar, i) => (
                    <g key={i}>
                      <rect x={bar.x} y={bar.y} width="22" height={bar.height} fill="#171717" opacity="0.8" rx="2" className="hover:opacity-100 transition-opacity" />
                      <text x={bar.x + 11} y={bar.y - 4} textAnchor="middle" className="fill-neutral-400 text-[7px] font-mono">{bar.value}</text>
                      <text x={bar.x + 11} y="138" textAnchor="middle" className="fill-neutral-500 text-[7px] uppercase font-bold tracking-wider">{bar.label.slice(0, 4)}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABULAR REPORT DATA */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-md">
        <div className="flex justify-between items-center p-4 bg-neutral-50/80 border-b border-neutral-200/80">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
            Compiled Dataset ({compiledData.length} records)
          </span>
          {compiledData.length > 0 && (
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-200 text-[10px] text-neutral-900 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export Dataset to CSV
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> Aggregating records...
          </div>
        ) : compiledData.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500 flex flex-col items-center gap-2 border border-dashed border-neutral-200 m-4 rounded-xl">
            <Info className="w-5 h-5 text-neutral-600" />
            No report dataset compiled yet. Click "Generate Report" above.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[40vh]">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200/80">
                  {Object.keys(compiledData[0] || {}).map(k => (
                    <th key={k} className="p-3 font-bold uppercase tracking-wider">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {compiledData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/25 transition-colors text-neutral-900">
                    {Object.keys(row).map(k => (
                      <td key={k} className="p-3 max-w-xs truncate">{String(row[k] ?? '0')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
