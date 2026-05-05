import { useEffect, useState } from 'react';
import { Users, CheckCircle, XCircle, TrendingUp, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  total: number;
  present: number;
  absent: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split('T')[0];
      const [workersRes, attendanceRes] = await Promise.all([
        supabase.from('workers').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status').eq('date', today),
      ]);

      const total = workersRes.count ?? 0;
      const present = attendanceRes.data?.filter((a) => a.status === 'present').length ?? 0;
      const absent = total - present;
      setStats({ total, present, absent: Math.max(0, absent) });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const summaryCards = [
    {
      label: 'Present Today',
      value: stats.present,
      icon: <CheckCircle size={20} />,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      valueColor: '#16a34a',
      trend: stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}% attendance` : '--',
    },
    {
      label: 'Absent',
      value: stats.absent,
      icon: <XCircle size={20} />,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      valueColor: '#dc2626',
      trend: stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}% absent` : '--',
    },
    {
      label: 'Total Workers',
      value: stats.total,
      icon: <Users size={20} />,
      iconBg: '#EEEDFE',
      iconColor: '#534AB7',
      valueColor: '#26215C',
      trend: 'Registered workers',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="section-title">Overview</h2>
          <p className="section-subtitle flex items-center gap-1.5 mt-1">
            <Calendar size={12} className="text-gray-400" />
            {todayStr}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold"
          style={{ backgroundColor: '#EEEDFE', color: '#534AB7' }}
        >
          <Clock size={13} />
          Live
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="card-frost p-6"
          >
            <div className="flex items-start justify-between mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
              >
                {card.icon}
              </div>
              <TrendingUp size={13} className="text-gray-300 mt-1" />
            </div>
            <div
              className="text-[32px] font-bold leading-none mb-2 tracking-tight"
              style={{ color: card.valueColor }}
            >
              {loading ? (
                <span className="inline-block w-14 h-9 bg-white/60 rounded-lg animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <p className="text-[13px] font-semibold text-gray-700 leading-tight">{card.label}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-tight">{card.trend}</p>
          </div>
        ))}
      </div>

      {/* Attendance Rate Bar */}
      {!loading && stats.total > 0 && (
        <div className="card p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-gray-700">Today's Attendance Rate</h3>
            <span className="text-[13px] font-bold" style={{ color: '#534AB7' }}>
              {Math.round((stats.present / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(stats.present / stats.total) * 100}%`,
                backgroundColor: '#534AB7',
              }}
            />
          </div>
          <div className="flex justify-between mt-2.5 text-[11px] text-gray-400">
            <span>{stats.present} present</span>
            <span>{stats.absent} absent</span>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-[13px] font-semibold text-gray-700 mb-2">About This System</h3>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            This admin dashboard manages labour attendance via face recognition, worker registrations,
            and document generation for Sairaj Engineering Works.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-[13px] font-semibold text-gray-700 mb-2">System Status</h3>
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-2.5">
              <span className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block flex-shrink-0" />
              <span className="text-[12px] text-gray-500">All systems operational</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block flex-shrink-0" />
              <span className="text-[12px] text-gray-500">Database connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
