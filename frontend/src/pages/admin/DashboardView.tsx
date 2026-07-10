import React, { useState } from 'react';
import { Wallet, ShoppingCart, Footprints, RotateCcw, AlertTriangle, ArrowUpRight, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  data: any;
  products: any[];
  returns: any[];
  onTabChange: (tab: any) => void;
}

export default function DashboardView({ data, products, returns, onTabChange }: DashboardViewProps) {
  const [collapsedSalesTrend, setCollapsedSalesTrend] = useState(false);
  const [collapsedCategoryShare, setCollapsedCategoryShare] = useState(false);

  // Helper: format currency
  const formatCurrency = (paise: number) => {
    return '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // 7-day daily revenue calculation helper for trend chart
  const getDailyRevenueData = () => {
    if (!data?.daily_sales) {
      // Fallback dummy data for visualization matching gold theme
      return [
        { label: 'Mon', revenue: 4500000 },
        { label: 'Tue', revenue: 5800000 },
        { label: 'Wed', revenue: 5200000 },
        { label: 'Thu', revenue: 7500000 },
        { label: 'Fri', revenue: 8200000 },
        { label: 'Sat', revenue: 9500000 },
        { label: 'Sun', revenue: 11000000 }
      ];
    }
    return data.daily_sales;
  };

  const trendData = getDailyRevenueData();
  const maxRevenue = Math.max(...trendData.map((d: any) => Math.max((d.revenue || 0) / 100, 2000)), 5000);
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(pct => Math.round(pct * maxRevenue));
  
  const chartPoints = trendData.map((d: any, idx: number) => {
    const x = 50 + idx * 100;
    const val = (d.revenue || 0) / 100;
    const y = 220 - (val / maxRevenue) * 200;
    return { x, y, label: d.label, val };
  });

  const linePath = chartPoints.map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = chartPoints.length > 0
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 220 L ${chartPoints[0].x} 220 Z`
    : '';

  // Category share calculation
  const getCategoryShareData = () => {
    if (!data?.category_sales) {
      return [
        { category: 'Oxford Jodhpur', value: 45 },
        { category: 'Chelsea Boot', value: 30 },
        { category: 'Double Monk', value: 15 },
        { category: 'Loafers', value: 10 }
      ];
    }
    return data.category_sales;
  };

  const catShare = getCategoryShareData();

  return (
    <div className="space-y-6 animate-fade-in text-neutral-900">
      {/* Welcome header info card */}
      <div className="relative overflow-hidden bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-neutral-100 rounded-full blur-3xl opacity-60"></div>
        <div className="space-y-1.5 relative z-10">
          <span className="text-[9px] uppercase tracking-widest font-black text-neutral-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> HeelsUp Intelligence Engine
          </span>
          <h1 className="text-2xl font-light font-display italic text-neutral-900">Overview Dashboard</h1>
          <p className="text-xs text-neutral-500">Real-time e-commerce logs and retail metrics registry</p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Revenue Card */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 hover:border-primary/40 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-neutral-900/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Total Revenue</span>
              <h3 className="text-2xl font-bold font-mono tracking-tight text-neutral-900 group-hover:text-neutral-900 transition-colors">
                {formatCurrency((data?.total_sales || 0) + (data?.total_pos_sales || 0))}
              </h3>
            </div>
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-2xl text-neutral-900">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-200/80/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Web: {formatCurrency(data?.total_sales || 0)}</span>
            <span className="text-neutral-600">|</span>
            <span>POS: {formatCurrency(data?.total_pos_sales || 0)}</span>
          </div>
        </div>

        {/* 2. Total Orders Card */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 hover:border-primary/40 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-neutral-900/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Total Orders</span>
              <h3 className="text-2xl font-bold font-mono tracking-tight text-neutral-900 group-hover:text-neutral-900 transition-colors">
                {(data?.orders_count || 0) + (data?.pos_sales_count || 0)}
              </h3>
            </div>
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-2xl text-neutral-900">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-200/80/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Web: {data?.orders_count || 0}</span>
            <span className="text-neutral-600">|</span>
            <span>POS: {data?.pos_sales_count || 0}</span>
          </div>
        </div>

        {/* 3. Catalog Products Card */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 hover:border-primary/40 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-neutral-900/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Catalog Products</span>
              <h3 className="text-2xl font-bold font-mono tracking-tight text-neutral-900 group-hover:text-neutral-900 transition-colors">
                {products.length}
              </h3>
            </div>
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-2xl text-neutral-900">
              <Footprints className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-200/80/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Active: {products.filter(p => p.active).length}</span>
            <span className="text-neutral-600">|</span>
            <span className="text-rose-500">Out: {products.filter(p => p.stock <= 0).length}</span>
          </div>
        </div>

        {/* 4. Pending Exchanges Card */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 hover:border-primary/40 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-neutral-900/5 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Pending Exchanges</span>
              <h3 className="text-2xl font-bold font-mono tracking-tight text-neutral-900 group-hover:text-neutral-900 transition-colors">
                {returns.filter(r => r.status === 'pending').length}
              </h3>
            </div>
            <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-2xl text-neutral-900">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-200/80/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>Requires Action</span>
            <button onClick={() => onTabChange('returns')} className="text-neutral-900 hover:underline flex items-center gap-0.5">
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Charts & Stock Alert Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle Columns: Sales Trend SVG Chart */}
        <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-900 animate-pulse" /> Revenue Trend (Last 7 Days)
            </span>
            <button
              onClick={() => setCollapsedSalesTrend(!collapsedSalesTrend)}
              className="text-[9px] text-neutral-500 hover:text-neutral-900 uppercase tracking-widest font-bold font-mono"
            >
              {collapsedSalesTrend ? 'Expand' : 'Collapse'}
            </button>
          </div>

          {!collapsedSalesTrend && (
            <div className="relative pt-4">
              <svg className="w-full h-64 overflow-visible" viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#171717" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#171717" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Grid Lines */}
                <line x1="45" y1="20" x2="675" y2="20" stroke="#e5e5e5" strokeWidth="1" />
                <line x1="45" y1="70" x2="675" y2="70" stroke="#e5e5e5" strokeWidth="1" />
                <line x1="45" y1="120" x2="675" y2="120" stroke="#e5e5e5" strokeWidth="1" />
                <line x1="45" y1="170" x2="675" y2="170" stroke="#e5e5e5" strokeWidth="1" />
                <line x1="45" y1="220" x2="675" y2="220" stroke="#d4d4d4" strokeWidth="1.5" />

                {/* Y Axis Labels */}
                {yLabels.map((val, idx) => {
                  const y = 220 - idx * 50;
                  return (
                    <text key={idx} x="35" y={y + 4} textAnchor="end" className="text-[9px] fill-neutral-500 font-mono font-bold">
                      ₹{val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                    </text>
                  );
                })}

                {/* Area path */}
                {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

                {/* Line path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#171717"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )}

                {/* Points & Hover Tooltips */}
                {chartPoints.map((p: any, idx: number) => (
                  <g key={idx} className="group/node">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      className="fill-white stroke-neutral-900 stroke-2 hover:r-6 cursor-pointer transition-all"
                    />
                    <text
                      x={p.x}
                      y="235"
                      textAnchor="middle"
                      className="text-[9px] fill-neutral-400 font-mono"
                    >
                      {p.label}
                    </text>
                    {/* Tooltip on Node Hover */}
                    <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200">
                      <rect
                        x={p.x - 35}
                        y={p.y - 32}
                        width="70"
                        height="20"
                        rx="6"
                        className="fill-neutral-900 stroke-neutral-200 stroke"
                      />
                      <text
                        x={p.x}
                        y={p.y - 19}
                        textAnchor="middle"
                        className="text-[8px] fill-white font-mono font-bold"
                      >
                        ₹{p.val.toFixed(0)}
                      </text>
                    </g>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Right Column: Inventory Alerts & Category Mix */}
        <div className="space-y-6">
          {/* Category mix */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-900">Category Share</span>
              <button
                onClick={() => setCollapsedCategoryShare(!collapsedCategoryShare)}
                className="text-[9px] text-neutral-500 hover:text-neutral-900 uppercase tracking-widest font-bold font-mono"
              >
                {collapsedCategoryShare ? 'Expand' : 'Collapse'}
              </button>
            </div>

            {!collapsedCategoryShare && (
              <div className="space-y-3.5 pt-2">
                {catShare.map((cat: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-neutral-700">
                      <span>{cat.category || 'Oxford Shoes'}</span>
                      <span className="text-neutral-900 font-bold">{cat.value || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/80/40">
                      <div
                        className="h-full bg-neutral-900 rounded-full"
                        style={{ width: `${cat.value || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock warning notifications */}
          <div className="bg-white border border-[#ef4444]/15 rounded-3xl p-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 animate-bounce" /> Inventory Alerts
            </span>

            <div className="space-y-3 pt-2 max-h-40 overflow-y-auto pr-1">
              {products.filter(p => p.stock <= 5).slice(0, 5).map((prod) => (
                <div key={prod.id} className="flex justify-between items-center p-2.5 bg-rose-50/50 border border-rose-200/60 rounded-xl text-xs font-mono">
                  <span className="truncate max-w-[130px] font-bold text-neutral-700">{prod.name}</span>
                  <span className="text-[10px] bg-[#ef4444]/20 border border-[#ef4444]/20 text-rose-600 px-1.5 py-0.5 rounded font-extrabold">
                    {prod.stock} stock
                  </span>
                </div>
              ))}
              {products.filter(p => p.stock <= 5).length === 0 && (
                <div className="text-center py-6 text-xs text-neutral-500 italic">Inventory stock is fully optimized.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
