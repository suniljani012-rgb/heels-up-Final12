import React, { useState, useEffect } from 'react';
import { Database, Play, Trash2, Download, AlertTriangle, Shield, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DbConsoleProps {
  tables: { id: string; label: string }[];
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export default function DbConsole({ tables, showToast }: DbConsoleProps) {
  const [selectedTable, setSelectedTable] = useState('products');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM products LIMIT 50;');
  const [queryResults, setQueryResults] = useState<any | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  
  // Table rows viewer
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const pageSize = 100;

  // History parameters
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('heelsup_sql_history');
    return saved ? JSON.parse(saved) : [
      'SELECT * FROM products LIMIT 10;',
      'SELECT order_number, total_amount, order_status FROM orders ORDER BY id DESC LIMIT 5;',
      'SELECT email, role, is_blocked FROM users WHERE role = \'admin\';',
      'SELECT code, discount_value, min_purchase FROM coupons;'
    ];
  });

  // Fetch Table Rows for Viewer
  const fetchTableRows = async (tableName: string, page: number = 0) => {
    setTableLoading(true);
    const offset = page * pageSize;
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset};`
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTableRows(data.data.results || []);
        if (data.data.results?.[0]) {
          setTableCols(Object.keys(data.data.results[0]));
        } else {
          setTableCols([]);
        }
      } else {
        showToast('error', 'Loader Error', data.error || 'Could not load table rows.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to read table rows.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTableRows(selectedTable, tablePage);
  }, [selectedTable, tablePage]);

  // Execute custom query
  const executeQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlQuery.trim()) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResults(null);

    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setQueryResults(data.data);
        showToast('success', 'Execution Completed', `SQL compiled. Rows updated: ${data.data.changes || 0}.`);
        
        // Add to history if unique
        if (!queryHistory.includes(sqlQuery)) {
          const updated = [sqlQuery, ...queryHistory].slice(0, 15);
          setQueryHistory(updated);
          localStorage.setItem('heelsup_sql_history', JSON.stringify(updated));
        }

        // Refresh viewer if query was on currently selected table
        if (sqlQuery.toLowerCase().includes(`update ${selectedTable}`) || 
            sqlQuery.toLowerCase().includes(`delete from ${selectedTable}`) ||
            sqlQuery.toLowerCase().includes(`insert into ${selectedTable}`)) {
          fetchTableRows(selectedTable, tablePage);
        }
      } else {
        setQueryError(data.error || 'Server syntax error.');
      }
    } catch (err: any) {
      setQueryError(err.message || 'Connection failure to SQL worker engine.');
    } finally {
      setQueryLoading(false);
    }
  };

  // Row Delete
  const handleRowDelete = async (rowId: any) => {
    if (!window.confirm(`Are you absolutely sure you want to delete row ID ${rowId} from table '${selectedTable}'? This write operation cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('heelsup_token')}`
        },
        body: JSON.stringify({
          sql: `DELETE FROM ${selectedTable} WHERE id = ?;`,
          params: [rowId]
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Record Destroyed', `Successfully deleted record ${rowId} from database.`);
        fetchTableRows(selectedTable, tablePage);
      } else {
        showToast('error', 'Operation Blocked', data.error || 'Foreign key constraint violation.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Failed to execute deletion.');
    }
  };

  // CSV Exporter
  const exportToCsv = (rowsArray: any[], filename: string) => {
    if (!rowsArray || rowsArray.length === 0) return;
    const headers = Object.keys(rowsArray[0]);
    const csvContent = [
      headers.join(','),
      ...rowsArray.map(row => 
        headers.map(header => {
          const val = row[header];
          const valStr = val === null || val === undefined ? 'NULL' : String(val);
          return `"${valStr.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('info', 'Export Successful', `${filename}.csv generated and downloaded.`);
  };

  const handleTemplateClick = (template: string) => {
    setSqlQuery(template);
    showToast('info', 'Template Loaded', 'Query loaded into terminal editor.');
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem('heelsup_sql_history');
    showToast('info', 'History Cleared', 'Query history purged.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white font-display italic">Database Administration Console</h2>
          <p className="text-[10px] text-neutral-500 font-medium">Execute raw SQL queries directly in the SQLite Cloudflare D1 environment.</p>
        </div>
        <div className="flex items-center gap-2 text-rose-500 bg-rose-500/5 border border-rose-500/10 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" /> High Risk Environment
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Terminal and Results (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Query Console Form */}
          <form onSubmit={executeQuery} className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" /> SQL Editor Terminal
              </span>
              <button
                type="button"
                onClick={() => setSqlQuery('')}
                className="text-[9px] text-neutral-500 hover:text-white uppercase tracking-wider"
              >
                Clear Terminal
              </button>
            </div>
            
            <textarea
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              placeholder="SELECT * FROM products ORDER BY id DESC LIMIT 10;"
              className="w-full h-44 bg-[#070707] border border-neutral-900 rounded-xl p-4 text-xs font-mono text-[#ead2ae] focus:outline-none focus:border-amber-500/60"
            />
            
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-neutral-500 italic">Terminator (;) is required for multi-line statements.</span>
              <button
                type="submit"
                disabled={queryLoading}
                className="px-5 py-2.5 bg-[#ead2ae] hover:bg-[#b17e3f] disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-lg active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {queryLoading ? 'Compiling...' : 'Execute Statement'}
              </button>
            </div>
          </form>

          {/* Execution Error Console */}
          {queryError && (
            <div className="p-4 bg-rose-950/10 border border-rose-900/30 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <h5 className="font-bold uppercase tracking-wide text-[10px]">SQL Query Compilation Error</h5>
                <p className="mt-1 font-mono text-[11px] leading-relaxed">{queryError}</p>
              </div>
            </div>
          )}

          {/* Execution Results View */}
          {queryResults && (
            <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
              <div className="flex justify-between items-center p-4 bg-[#121211]/80 border-b border-neutral-900">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Query execution results ({queryResults.results?.length || 0} rows | {queryResults.duration || 0}ms)
                </span>
                {queryResults.results?.length > 0 && (
                  <button
                    onClick={() => exportToCsv(queryResults.results, 'custom_sql_export')}
                    className="px-2 py-1 border border-neutral-800 hover:bg-neutral-850 text-[9px] text-white rounded-lg flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                )}
              </div>

              {queryResults.results?.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                  Statement executed successfully. Changes recorded: {queryResults.changes || 0}. Last Insert ID: {queryResults.last_row_id || 0}.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[30vh]">
                  <table className="w-full text-[10px] text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900">
                        {Object.keys(queryResults.results[0] || {}).map(k => (
                          <th key={k} className="p-3 font-bold uppercase tracking-wider">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/60">
                      {queryResults.results.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-[#121211]/25 transition-colors text-white">
                          {Object.keys(row).map(k => (
                            <td key={k} className="p-3 max-w-xs truncate">{String(row[k] ?? 'NULL')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Templates and Database Schemas (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Templates lists */}
          <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl space-y-4 shadow-md">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Console Query History</h3>
              {queryHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[9px] text-rose-500 font-bold uppercase tracking-wider"
                >
                  Clear History
                </button>
              )}
            </div>
            
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {queryHistory.map((hist, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(hist)}
                  className="w-full text-left p-2.5 bg-[#121211] border border-neutral-850 hover:border-amber-500/30 rounded-xl text-[10px] font-mono text-neutral-400 hover:text-amber-500 truncate block transition-all"
                >
                  {hist}
                </button>
              ))}
            </div>
          </div>

          {/* Quick statement library */}
          <div className="bg-[#0f0f0e] border border-neutral-900 p-5 rounded-2xl space-y-3 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-neutral-900 pb-3">Template Command Library</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTemplateClick('SELECT sku, name, stock FROM products WHERE stock < 5 ORDER BY stock ASC;')}
                className="w-full text-left p-2 hover:bg-neutral-850 rounded text-[10px] text-neutral-400 hover:text-white"
              >
                ⚠️ Check Low Stock Products
              </button>
              <button
                type="button"
                onClick={() => handleTemplateClick('SELECT order_number, total_amount, order_status, created_at FROM orders WHERE order_status = \'placed\' ORDER BY id DESC;')}
                className="w-full text-left p-2 hover:bg-neutral-850 rounded text-[10px] text-neutral-400 hover:text-white"
              >
                📦 Check Placed Unprocessed Orders
              </button>
              <button
                type="button"
                onClick={() => handleTemplateClick('SELECT code, discount_type, discount_value, min_purchase, active FROM coupons WHERE active = 1;')}
                className="w-full text-left p-2 hover:bg-neutral-850 rounded text-[10px] text-neutral-400 hover:text-white"
              >
                🏷️ List Active Coupons
              </button>
              <button
                type="button"
                onClick={() => handleTemplateClick('SELECT role, COUNT(*) as count FROM users GROUP BY role;')}
                className="w-full text-left p-2 hover:bg-neutral-850 rounded text-[10px] text-neutral-400 hover:text-white"
              >
                👥 Count Users Roles distribution
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Data Viewer grid */}
      <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[#121211]/80 border-b border-neutral-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Data Viewer Table:</span>
            <select
              value={selectedTable}
              onChange={e => {
                setSelectedTable(e.target.value);
                setTablePage(0);
              }}
              className="bg-[#070707] border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            {tableRows.length > 0 && (
              <button
                onClick={() => exportToCsv(tableRows, `table_export_${selectedTable}`)}
                className="px-3 py-1.5 border border-neutral-800 hover:bg-neutral-850 text-[10px] text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Dump Table to CSV
              </button>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <button
                disabled={tablePage === 0}
                onClick={() => setTablePage(p => p - 1)}
                className="p-1 hover:bg-neutral-850 border border-neutral-800 rounded disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>Page {tablePage + 1}</span>
              <button
                disabled={tableRows.length < pageSize}
                onClick={() => setTablePage(p => p + 1)}
                className="p-1 hover:bg-neutral-850 border border-neutral-800 rounded disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {tableLoading ? (
          <div className="py-24 text-center text-xs text-neutral-500">Retrieving sqlite records...</div>
        ) : tableRows.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500">No records found. Table is empty.</div>
        ) : (
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-[10px] text-left border-collapse font-mono">
              <thead>
                <tr className="bg-[#070707]/80 text-neutral-400 border-b border-neutral-900">
                  {tableCols.map(col => (
                    <th key={col} className="p-3 font-bold uppercase tracking-wider">{col}</th>
                  ))}
                  <th className="p-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-[#121211]/25 transition-colors text-white">
                    {tableCols.map(col => (
                      <td key={col} className="p-3 max-w-xs truncate">{String(row[col] ?? 'NULL')}</td>
                    ))}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRowDelete(row.id)}
                        className="p-1 text-rose-500 hover:bg-neutral-900 rounded hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
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
