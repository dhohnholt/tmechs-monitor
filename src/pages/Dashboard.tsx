import React, { useState, useEffect } from 'react';
import { BarChart, Calendar, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

interface ViolationStats {
  type: string;
  count: number;
}

interface MonthlyTrend {
  date: string;
  count: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [violationStats, setViolationStats] = useState<ViolationStats[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [totalViolations, setTotalViolations] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [detentionSessions, setDetentionSessions] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get violation types distribution
      const { data: violationTypes, error: violationError } = await supabase
        .from('violations')
        .select('violation_type')
        .gte('created_at', subMonths(new Date(), 1).toISOString());

      if (violationError) throw violationError;

      const typeCounts: { [key: string]: number } = {};
      violationTypes?.forEach(v => {
        typeCounts[v.violation_type] = (typeCounts[v.violation_type] || 0) + 1;
      });

      setViolationStats(
        Object.entries(typeCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Get monthly trends
      const startDate = startOfMonth(subMonths(new Date(), 2));
      const endDate = endOfMonth(new Date());
      
      const { data: trendData, error: trendError } = await supabase
        .from('violations')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (trendError) throw trendError;

      const dailyCounts: { [key: string]: number } = {};
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      days.forEach(day => {
        dailyCounts[format(day, 'yyyy-MM-dd')] = 0;
      });

      trendData?.forEach(violation => {
        const date = format(new Date(violation.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      setMonthlyTrends(
        Object.entries(dailyCounts)
          .map(([date, count]) => ({ date, count }))
          .slice(-30) // Last 30 days
      );

      // Get summary statistics
      setTotalViolations(trendData?.length || 0);

      const { count: studentCount } = await supabase
        .from('violations')
        .select('student_id', { count: 'exact', head: true, distinct: true })
        .gte('created_at', startDate.toISOString());

      setTotalStudents(studentCount || 0);

      const { count: sessionCount } = await supabase
        .from('detention_slots')
        .select('*', { count: 'exact', head: true })
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      setDetentionSessions(sessionCount || 0);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-tmechs-forest" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Behavior Monitoring Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Violations</p>
              <p className="text-2xl font-semibold text-gray-900">{totalViolations}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Detention Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{detentionSessions}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students Involved</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStudents}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-2 text-sm text-gray-500">Active cases</p>
        </div>
      </div>

      {/* Violation Types Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Violation Types Distribution</h2>
        <div className="space-y-4">
          {violationStats.map((stat) => (
            <div key={stat.type}>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{stat.type}</span>
                <span>{stat.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-tmechs-forest h-2 rounded-full"
                  style={{ width: `${(stat.count / Math.max(...violationStats.map(s => s.count))) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Violation Trends</h2>
        <div className="h-64">
          <div className="h-full flex items-end space-x-1">
            {monthlyTrends.map((trend, index) => {
              const maxCount = Math.max(...monthlyTrends.map(t => t.count));
              const height = trend.count ? (trend.count / maxCount) * 100 : 0;
              
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center group"
                  title={`${trend.count} violations on ${format(new Date(trend.date), 'MMM d, yyyy')}`}
                >
                  <div className="w-full relative">
                    <div
                      className="w-full bg-tmechs-forest hover:bg-tmechs-forest/80 rounded-t transition-all duration-200"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                    {format(new Date(trend.date), 'MMM d')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}