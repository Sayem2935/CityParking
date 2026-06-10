import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useVehicleStore } from '../store';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Mock data for charts
const weeklyActivity = [
  { day: 'Mon', detections: 145, predictions: 132, optimizations: 89 },
  { day: 'Tue', detections: 178, predictions: 165, optimizations: 112 },
  { day: 'Wed', detections: 203, predictions: 198, optimizations: 145 },
  { day: 'Thu', detections: 189, predictions: 176, optimizations: 134 },
  { day: 'Fri', detections: 256, predictions: 243, optimizations: 189 },
  { day: 'Sat', detections: 312, predictions: 298, optimizations: 223 },
  { day: 'Sun', detections: 198, predictions: 187, optimizations: 156 },
];

const zoneOccupancy = [
  { name: 'Zone A', value: 78, color: '#3b82f6' },
  { name: 'Zone B', value: 45, color: '#8b5cf6' },
  { name: 'Zone C', value: 92, color: '#f59e0b' },
  { name: 'Zone D', value: 34, color: '#22c55e' },
];

const hourlyPredictions = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  predicted: Math.floor(40 + Math.sin(i / 3) * 30 + Math.random() * 10),
  actual: i < new Date().getHours() ? Math.floor(38 + Math.sin(i / 3) * 28 + Math.random() * 12) : null,
}));

const recentActivity = [
  { time: '2 min ago', event: 'Vehicle detected — Zone A, Slot 12', type: 'detection', icon: '👁' },
  { time: '5 min ago', event: 'LSTM prediction updated — Peak at 14:00', type: 'prediction', icon: '📈' },
  { time: '8 min ago', event: 'RL agent optimized Zone C allocation', type: 'optimization', icon: '⚡' },
  { time: '12 min ago', event: 'Plate ABC-1234 verified — Access granted', type: 'access', icon: '✓' },
  { time: '15 min ago', event: 'Digital twin sync completed', type: 'sync', icon: '🔄' },
  { time: '22 min ago', event: 'Face enrollment processed — User #42', type: 'face', icon: '👤' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { vehicles, getVehicles } = useVehicleStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getVehicles();
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [getVehicles]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const greetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 skeleton rounded-lg w-64" />
          <div className="h-4 skeleton rounded-lg w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 skeleton rounded-xl" />
          <div className="h-80 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Registered Vehicles',
      value: vehicles.length,
      subValue: 'active fleet',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      gradient: 'from-blue-500 to-blue-600',
      trend: vehicles.length > 0 ? `+${vehicles.length} active` : 'None registered',
      trendUp: true,
    },
    {
      label: 'AI Detections Today',
      value: '1,247',
      subValue: '+12.3% vs yesterday',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
      trend: 'YOLO v8 Active',
      trendUp: true,
    },
    {
      label: 'Prediction Accuracy',
      value: '94.2%',
      subValue: 'LSTM model',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      gradient: 'from-orange-500 to-amber-600',
      trend: '↑ 2.1% this week',
      trendUp: true,
    },
    {
      label: 'RL Optimization Score',
      value: '87.6',
      subValue: 'reward function',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      trend: 'DQN converged',
      trendUp: true,
    },
  ];

  const aiFeatures = [
    {
      title: 'YOLO Parking Detection',
      description: 'Real-time vehicle detection using YOLO v8 computer vision',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/parking',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      badge: 'YOLO v8',
    },
    {
      title: 'LSTM Occupancy Prediction',
      description: 'Forecast parking demand with deep learning time-series analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      path: '/parking/predictions',
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400',
      badge: 'LSTM',
    },
    {
      title: 'RL Dynamic Optimization',
      description: 'Reinforcement learning agent for real-time slot allocation',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      ),
      path: '/parking/optimization',
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
      badge: 'DQN',
    },
    {
      title: 'Digital Twin Simulation',
      description: 'Real-time 3D simulation of parking infrastructure',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
      path: '/parking/digital-twin',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400',
      badge: 'Simulation',
    },
  ];

  const quickActions = [
    { title: 'Add Vehicle', icon: '+', action: () => navigate('/vehicles/add') },
    { title: 'Face Enroll', icon: '👤', action: () => navigate('/face-enrollment') },
    { title: 'My Profile', icon: '⚙', action: () => navigate('/profile') },
    { title: 'My Vehicles', icon: '🚗', action: () => navigate('/vehicles') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {greetingTime()}, {user?.firstName || 'Commander'}
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              AI Active
            </span>
          </div>
          <p className="text-zinc-500 text-sm">
            CityParking Command Center — {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">All Systems Operational</span>
          </div>
          <div className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full">
            <span className="text-xs font-mono text-zinc-400">v2.4.0</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-all duration-300 group"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {kpi.icon}
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${kpi.trendUp ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {kpi.trendUp && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                )}
                {kpi.trend}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{kpi.label}</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">{kpi.subValue}</p>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${kpi.gradient} opacity-60`} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">AI Activity Overview</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Weekly detections, predictions & optimizations</p>
            </div>
            <div className="flex items-center gap-4">
              {[
                { label: 'Detections', color: '#3b82f6' },
                { label: 'Predictions', color: '#f59e0b' },
                { label: 'Optimizations', color: '#8b5cf6' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyActivity}>
              <defs>
                <linearGradient id="detectionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predictionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="detections" name="Detections" stroke="#3b82f6" strokeWidth={2} fill="url(#detectionsGrad)" />
              <Area type="monotone" dataKey="predictions" name="Predictions" stroke="#f59e0b" strokeWidth={2} fill="url(#predictionsGrad)" />
              <Area type="monotone" dataKey="optimizations" name="Optimizations" stroke="#8b5cf6" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Occupancy Pie */}
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Zone Occupancy</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Current fill rate by zone</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={zoneOccupancy}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {zoneOccupancy.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {zoneOccupancy.map((zone) => (
              <div key={zone.name} className="flex items-center justify-between px-2 py-1.5 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span className="text-[11px] text-zinc-400">{zone.name}</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-white">{zone.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Prediction Chart */}
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">24-Hour Occupancy Forecast</h3>
            <p className="text-xs text-zinc-500 mt-0.5">LSTM model predictions vs actual occupancy</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-semibold text-orange-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            LSTM Model Active
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyPredictions} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="predicted" name="Predicted" fill="#3b82f6" radius={[2, 2, 0, 0]} opacity={0.8} />
            <Bar dataKey="actual" name="Actual" fill="#22c55e" radius={[2, 2, 0, 0]} opacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Features + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Features */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">AI Modules</h2>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">4 Active Models</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiFeatures.map((feature) => (
              <button
                key={feature.title}
                onClick={() => navigate(feature.path)}
                className={`relative overflow-hidden ${feature.bgColor} border ${feature.borderColor} rounded-xl p-4 text-left group hover:border-opacity-40 transition-all duration-300`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${feature.textColor} text-sm`}>{feature.title}</h3>
                      <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-zinc-500">{feature.badge}</span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{feature.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Live Activity</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500">Real-time</span>
            </div>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, index) => (
              <div key={index} className="flex items-start gap-3 group">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 leading-relaxed">{item.event}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.action}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-700 transition-all text-left group"
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Onboarding Checklist */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">Get Started with CityParking</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-4">Complete these steps to unlock the full power of AI-driven parking management.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: 'Register a vehicle', done: vehicles.length > 0, action: () => navigate('/vehicles/add') },
            { label: 'Enroll face recognition', done: false, action: () => navigate('/face-enrollment') },
            { label: 'Explore AI predictions', done: false, action: () => navigate('/parking/predictions') },
            { label: 'Try the Digital Twin', done: false, action: () => navigate('/parking/digital-twin') },
          ].map((step, i) => (
            <button
              key={i}
              onClick={step.action}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/30 transition-all text-left"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                {step.done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <span className={`text-xs ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-300'}`}>{step.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;