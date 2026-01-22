import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className={`${color} text-white p-8 rounded-3xl shadow-xl flex items-start justify-between`}>
      <div className="flex-1">
        <div className="text-sm font-bold text-white/70 mb-3 uppercase tracking-wider">{title}</div>
        <div className="text-3xl font-black tracking-tight">{value}</div>
      </div>
      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
        {icon}
      </div>
    </div>
  );
};

export default DashboardCard;
