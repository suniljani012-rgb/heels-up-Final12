import { useState, useMemo } from 'react';
import { Activity, Search, Filter, Trash2, Download, RefreshCw } from 'lucide-react';

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

  // Purge/Clear Logs
  const handlePurgeLogs = async () => {
    if (!window.confirm('CRITICAL WARNING: You are about to permanently delete all administrative audit logs from the database. This action is irreversible and violates safety compliance. Do you wish to continue?')) {
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
          sql: 'DELETE FROM admin_audit_logs;'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Registry Cleared', 'All administrative audit logs have been purged.');
        onRefresh();
        setPage(0);
      } else {
        showToast('error', 'Purge Denied', data.error || 'Server rejected audit clear query.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not empty the audit log registry.');
    }
  };

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
      {/* Search and Action Bar */}
      <div className="bg-[#0f0f0e] border border-neutral-900 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
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
              className="w-full bg-[#121211] border border-neutral-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
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
              className="bg-[#121211] border border-neutral-850 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
            className="p-2 border border-neutral-850 hover:bg-neutral-850 rounded-xl text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {filteredLogs.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 border border-neutral-800 hover:bg-neutral-850 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Dump Registry
            </button>
          )}

          <button
            onClick={handlePurgeLogs}
            className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-neutral-950 text-rose-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Purge Logs
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0f0f0e] border border-neutral-900 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-[#121211]/80 border-b border-neutral-900 flex justify-between items-center">
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-500" />
            Audit registry database ({filteredLogs.length} matching events)
          </span>
          
          {/* Simple Pagination */}
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-1.5 py-0.5 border border-neutral-800 rounded hover:bg-neutral-850 disabled:opacity-45"
            >
              Prev
            </button>
            <span>{page + 1} / {Math.ceil(filteredLogs.length / pageSize) || 1}</span>
            <button
              disabled={(page + 1) * pageSize >= filteredLogs.length}
              onClick={() => setPage(p => p + 1)}
              className="px-1.5 py-0.5 border border-neutral-800 rounded hover:bg-neutral-850 disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-neutral-500">Retrieving audit log entries...</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="py-24 text-center text-xs text-neutral-500 border border-dashed border-neutral-850 m-4 rounded-xl">
            No audit records match the selected search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#070707] text-neutral-400 border-b border-neutral-900 font-mono">
                  <th className="p-3 font-bold uppercase tracking-wider w-36">Timestamp</th>
                  <th className="p-3 font-bold uppercase tracking-wider w-48">Administrator</th>
                  <th className="p-3 font-bold uppercase tracking-wider w-40">Action Category</th>
                  <th className="p-3 font-bold uppercase tracking-wider">Details Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 font-sans text-white">
                {paginatedLogs.map(l => (
                  <tr key={l.id} className="hover:bg-[#121211]/25 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-neutral-400 whitespace-nowrap">
                      {new Date(l.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-neutral-300">
                      {l.admin_email || 'System / Auto'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[9px] font-mono text-[#ead2ae] uppercase">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400 text-[11px] leading-relaxed">
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
