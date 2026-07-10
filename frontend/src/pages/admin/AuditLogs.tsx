import { useState, useMemo } from 'react';
import { Activity, Search, Filter, Download, RefreshCw } from 'lucide-react';

interface AuditLogsProps {
  logs: any[];
  loading: boolean;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export default function AuditLogs({ logs, loading, onRefresh, showToast }: AuditLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const emailMatch = l.admin_email ? l.admin_email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const actionMatch = l.action ? l.action.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const detailMatch = l.details ? l.details.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      
      const queryMatch = emailMatch || actionMatch || detailMatch;
      const filterMatch = selectedAction ? l.action === selectedAction : true;

      return queryMatch && filterMatch;
    });
  }, [logs, searchQuery, selectedAction]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const start = page * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page]);

  // Action options for filter
  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);



  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Admin Email', 'Action Category', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(l => [
        l.id,
        l.created_at,
        `"${String(l.admin_email || 'System').replace(/"/g, '""')}"`,
        `"${String(l.action || 'Unknown').replace(/"/g, '""')}"`,
        `"${String(l.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `heelsup_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Audit Exported', 'CSV report successfully downloaded.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="sticky top-0 bg-[#f5f5f4] z-10 -mt-6 pt-6 pb-4 space-y-4">
        <div>
          <h1 className="text-3xl font-light text-neutral-900 font-display italic">Audit Registry Logs</h1>
          <p className="text-xs text-neutral-500">Observe backend admin actions, security triggers and transaction audits</p>
        </div>

        {/* Search and Action Bar */}
        <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[180px]">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by admin email, action or details..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                value={selectedAction}
                onChange={e => {
                  setSelectedAction(e.target.value);
                  setPage(0);
                }}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="">All Actions</option>
                {actionOptions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="p-2 border border-neutral-200 hover:bg-neutral-200 rounded-xl text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {filteredLogs.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="px-3 py-2 border border-neutral-200 hover:bg-neutral-200 text-neutral-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Dump Registry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-neutral-50/80 border-b border-neutral-200/80 flex justify-between items-center">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-500" />
            Audit registry database ({filteredLogs.length} matching events)
          </span>
          
          {/* Simple Pagination */}
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-1.5 py-0.5 border border-neutral-200 rounded hover:bg-neutral-200 disabled:opacity-45"
            >
              Prev
            </button>
            <span>{page + 1} / {Math.ceil(filteredLogs.length / pageSize) || 1}</span>
            <button
              disabled={(page + 1) * pageSize >= filteredLogs.length}
              onClick={() => setPage(p => p + 1)}
              className="px-1.5 py-0.5 border border-neutral-200 rounded hover:bg-neutral-200 disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-500">Retrieving audit log entries...</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 m-4 rounded-xl">
            No audit records match the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200/80 font-mono">
                  <th className="p-3 font-bold uppercase tracking-wider w-36">Timestamp</th>
                  <th className="p-3 font-bold uppercase tracking-wider w-48">Administrator</th>
                  <th className="p-3 font-bold uppercase tracking-wider w-40">Action Category</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Details Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans text-neutral-900">
                {paginatedLogs.map(l => (
                  <tr key={l.id} className="hover:bg-neutral-50/25 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-neutral-500 whitespace-nowrap">
                      {new Date(l.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-neutral-700">
                      {l.admin_email || 'System / Auto'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[9px] font-mono text-neutral-700 uppercase">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-500 text-[11px] leading-relaxed">
                      {l.details}
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
