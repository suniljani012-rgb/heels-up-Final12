import React, { useState } from 'react';
import { Wallet, ShoppingCart, Footprints, RotateCcw, AlertTriangle, ArrowUpRight, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest font-black text-neutral-500 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> HeelsUp Intelligence Engine
          </span>
          <h1 className="text-3xl font-light font-display italic text-neutral-900">Overview Dashboard</h1>
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
            <div className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData.map((d: any) => ({
                    name: d.label,
                    Revenue: (d.revenue || 0) / 100
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      color: '#000000',
                      border: '1px solid #e5e5e5',
                      fontSize: '11px',
                      fontFamily: 'Aptos, sans-serif'
                    }}
                    itemStyle={{ color: '#000000' }}
                    labelStyle={{ color: '#000000', fontWeight: 'bold' }}
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <div className="h-64 pt-2 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catShare}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="category"
                    >
                      {catShare.map((entry: any, index: number) => {
                        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        color: '#000000',
                        border: '1px solid #e5e5e5',
                        fontSize: '10px',
                        fontFamily: 'Aptos, sans-serif'
                      }}
                      itemStyle={{ color: '#000000' }}
                      labelStyle={{ color: '#000000', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}%`, 'Share']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={6}
                      formatter={(value: any) => (
                        <span className="text-[9px] font-semibold text-neutral-700 font-sans">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
