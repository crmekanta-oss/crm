import React, { useState, useEffect } from 'react';
import DashboardCards from '../components/DashboardCards';
import { crmService } from '../services/crmService';
import Loader from '../components/Loader';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalLeads: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        // Using crmService for stats since that's where our data is
        const data = await crmService.getAll();
        
        const totalLeads = data.length;
        const totalRevenue = data.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
        const wonLeads = data.filter(l => l.status === 'Won').length;

        setStats({
          totalCustomers: totalLeads, // Treating leads as total contacts for now
          totalLeads: totalLeads,
          totalRevenue: totalRevenue,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg relative">
          <strong className="font-bold">Database Setup Required: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <DashboardCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-gray-400">
          <p className="font-medium">Activity Chart Placeholder</p>
          <p className="text-sm">Revenue analytics will appear here.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-gray-400">
          <p className="font-medium">Lead Distribution Placeholder</p>
          <p className="text-sm">Lead status breakdown will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
