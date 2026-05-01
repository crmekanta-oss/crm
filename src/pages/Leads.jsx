import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { leadService } from '../services/leadService';
import { Plus, Search, Target } from 'lucide-react';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { 
      header: 'Customer', 
      accessor: 'customers',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.customers?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-500">{row.customers?.company || 'No Company'}</p>
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          row.status === 'Won' ? 'bg-emerald-50 text-emerald-700' :
          row.status === 'Lost' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Value', 
      accessor: 'value',
      render: (row) => `$${Number(row.value).toLocaleString()}`
    },
    { 
      header: 'Created At', 
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const data = await leadService.getAll();
        setLeads(data);
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm">Track your sales opportunities</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-medium shadow-sm">
          <Plus size={20} />
          New Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Open Leads</p>
            <p className="text-lg font-bold text-gray-900">{leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Won Leads</p>
            <p className="text-lg font-bold text-gray-900">{leads.filter(l => l.status === 'Won').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
            <Target size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Conversion</p>
            <p className="text-lg font-bold text-gray-900">
              {leads.length > 0 ? ((leads.filter(l => l.status === 'Won').length / leads.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={leads} 
        loading={loading} 
      />
    </div>
  );
};

export default Leads;
