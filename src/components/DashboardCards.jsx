import React from 'react';
import { Users, Target, DollarSign, TrendingUp } from 'lucide-react';

const DashboardCards = ({ stats }) => {
  const cards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: <Users className="text-blue-600" />,
      bg: 'bg-blue-50',
      trend: '+12% from last month'
    },
    {
      title: 'Active Leads',
      value: stats.totalLeads,
      icon: <Target className="text-purple-600" />,
      bg: 'bg-purple-50',
      trend: '+5% from last month'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue?.toLocaleString()}`,
      icon: <DollarSign className="text-emerald-600" />,
      bg: 'bg-emerald-50',
      trend: '+18% from last month'
    },
    {
      title: 'Conversion Rate',
      value: `${((stats.totalLeads / (stats.totalCustomers || 1)) * 100).toFixed(1)}%`,
      icon: <TrendingUp className="text-orange-600" />,
      bg: 'bg-orange-50',
      trend: '+2% from last month'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${card.bg}`}>
              {card.icon}
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          <p className="text-xs text-emerald-600 font-medium mt-2">{card.trend}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
