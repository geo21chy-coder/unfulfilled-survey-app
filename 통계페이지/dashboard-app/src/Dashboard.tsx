import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Doughnut, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Download, Smartphone, Menu, Bell, Calendar, Search, X, ClipboardList } from 'lucide-react';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement,
  ChartDataLabels
);

interface FacilityData {
  id: number;
  category: string;
  name: string;
  status: string;
  parkingStatus: string;
  chargingStatus: string;
  surveyStatus: string;
  surveyDate: string;
  parkingMandate: number;
  parkingInstalled: number;
  chargingMandate: number;
  chargingInstalled: number;
  // Survey History Fields
  survey1Method: string;
  survey1Check: string;
  survey1Plan: string;
  survey2Method: string;
  survey2Check: string;
  survey2Plan: string;
  survey3Method: string;
  survey3Check: string;
  survey3Plan: string;
}

interface CategoryStat {
  category: string;
  total: number;
  compliant: number;
  nonCompliant: number;
  excluded: number;
  surveyDone: number;
  percentage: number;
  surveyPercentage: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [periodView, setPeriodView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [complianceView, setComplianceView] = useState<'all' | 'parking' | 'charging'>('all');
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterSurvey, setFilterSurvey] = useState('전체');
  const [selectedFacility, setSelectedFacility] = useState<FacilityData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/DB.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames.find(name => name.includes('통합관리')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const formattedData: FacilityData[] = jsonData.slice(1).map((row, index) => {
        let sDate = row[36];
        let surveyDateStr = '';
        if (sDate) {
          if (typeof sDate === 'number') {
            const dateObj = XLSX.SSF.parse_date_code(sDate);
            surveyDateStr = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          } else {
            surveyDateStr = String(sDate).trim();
            if (surveyDateStr.includes('.')) {
              surveyDateStr = surveyDateStr.split('.').join('-').replace(/-$/, '');
            }
          }
        }

        return {
          id: index,
          category: String(row[1] || '기타').trim(),
          status: String(row[2] || '정보없음').trim(),
          parkingStatus: String(row[20] || '정보없음').trim(),
          chargingStatus: String(row[27] || '정보없음').trim(),
          surveyStatus: String(row[3] || '미완료').trim(),
          name: String(row[4] || '이름없음').trim(),
          surveyDate: surveyDateStr,
          parkingMandate: Number(row[15]) || 0,
          parkingInstalled: Number(row[16]) || 0,
          chargingMandate: Number(row[21]) || 0,
          chargingInstalled: Number(row[23]) || 0,
          // Survey History
          survey1Method: String(row[40] || '-').trim(),
          survey1Check: String(row[43] || '-').trim(),
          survey1Plan: String(row[44] || '-').trim(),
          survey2Method: String(row[46] || '-').trim(),
          survey2Check: String(row[49] || '-').trim(),
          survey2Plan: String(row[50] || '-').trim(),
          survey3Method: String(row[52] || '-').trim(),
          survey3Check: String(row[55] || '-').trim(),
          survey3Plan: String(row[56] || '-').trim(),
        };
      }).filter(item => item.name !== '이름없음');

      setData(formattedData);
      setLastUpdate(new Date().toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getComplianceStatus = (item: FacilityData) => {
    if (complianceView === 'parking') return item.parkingStatus;
    if (complianceView === 'charging') return item.chargingStatus;
    return item.status;
  };

  const isCompliant = (status: string) => {
    return status === '이행완료';
  };

  const isNonCompliant = (status: string) => {
    return status.includes('미이행');
  };

  const isExcluded = (status: string) => {
    return status === '면제' || status === '제외대상';
  };

  const getCategoryStats = (): CategoryStat[] => {
    const statsMap = new Map<string, { total: number; compliant: number; nonCompliant: number; excluded: number; surveyDone: number }>();
    
    data.forEach(item => {
      const current = statsMap.get(item.category) || { total: 0, compliant: 0, nonCompliant: 0, excluded: 0, surveyDone: 0 };
      current.total += 1;
      
      const status = getComplianceStatus(item);
      if (isCompliant(status)) current.compliant += 1;
      else if (isNonCompliant(status)) current.nonCompliant += 1;
      else if (isExcluded(status)) current.excluded += 1;
      
      if (item.surveyStatus.includes('조사완료')) current.surveyDone += 1;
      statsMap.set(item.category, current);
    });

    return Array.from(statsMap.entries())
      .map(([category, s]) => ({
        category,
        total: s.total,
        compliant: s.compliant,
        nonCompliant: s.nonCompliant,
        excluded: s.excluded,
        surveyDone: s.surveyDone,
        percentage: s.total > 0 ? (s.compliant / s.total) * 100 : 0,
        surveyPercentage: s.total > 0 ? (s.surveyDone / s.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  };

  const allCategoryStats = getCategoryStats();
  const categoryStats = allCategoryStats.slice(0, 4); 
  
  const totalCompliant = data.filter(i => isCompliant(getComplianceStatus(i))).length;
  const overallPercentage = data.length > 0 ? (totalCompliant / data.length) * 100 : 0;
  
  const totalSurveyDone = data.filter(i => i.surveyStatus.includes('조사완료')).length;
  const surveyPercentage = data.length > 0 ? (totalSurveyDone / data.length) * 100 : 0;

  const nonCompliantCount = data.filter(item => isNonCompliant(getComplianceStatus(item))).length;
  const excludedCount = data.filter(item => isExcluded(getComplianceStatus(item))).length;

  // New logic for Surveyed Facilities Implementation Status
  const surveyedData = data.filter(i => i.surveyStatus.includes('조사완료'));
  const surveyedCompliantCount = surveyedData.filter(i => isCompliant(getComplianceStatus(i))).length;
  const surveyedOverallPercentage = surveyedData.length > 0 ? (surveyedCompliantCount / surveyedData.length) * 100 : 0;

  const getSurveyedCategoryStats = (): CategoryStat[] => {
    const statsMap = new Map<string, { total: number; compliant: number; nonCompliant: number; excluded: number }>();
    
    surveyedData.forEach(item => {
      const current = statsMap.get(item.category) || { total: 0, compliant: 0, nonCompliant: 0, excluded: 0 };
      current.total += 1;
      
      const status = getComplianceStatus(item);
      if (isCompliant(status)) current.compliant += 1;
      else if (isNonCompliant(status)) current.nonCompliant += 1;
      else if (isExcluded(status)) current.excluded += 1;
      
      statsMap.set(item.category, current);
    });

    return Array.from(statsMap.entries())
      .map(([category, s]) => ({
        category,
        total: s.total,
        compliant: s.compliant,
        nonCompliant: s.nonCompliant,
        excluded: s.excluded,
        surveyDone: s.total, // In this context, all are surveyed
        percentage: s.total > 0 ? (s.compliant / s.total) * 100 : 0,
        surveyPercentage: 100
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  };

  const surveyedCategoryStats = getSurveyedCategoryStats();

  const filteredList = useMemo(() => {
    return data.filter(item => {
      // 1. Base filter: status must include '미이행'
      if (!item.status.includes('미이행')) return false;

      // 2. Category filter
      if (filterCategory !== '전체' && item.category !== filterCategory) return false;

      // 3. Survey status filter
      if (filterSurvey !== '전체' && !item.surveyStatus.includes(filterSurvey)) return false;

      // 4. Search term
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      return true;
    });
  }, [data, searchTerm, filterCategory, filterSurvey]);

  const categories = useMemo(() => {
    const cats = new Set(data.map(i => i.category));
    return ['전체', ...Array.from(cats)].sort();
  }, [data]);

  const surveyStatuses = ['전체', '조사완료', '미완료'];

  const SurveyModal = () => {
    if (!selectedFacility) return null;

    const rounds = [
      { 
        title: '1차 조사', 
        method: selectedFacility.survey1Method, 
        check: selectedFacility.survey1Check, 
        plan: selectedFacility.survey1Plan,
        color: 'emerald'
      },
      { 
        title: '2차 조사', 
        method: selectedFacility.survey2Method, 
        check: selectedFacility.survey2Check, 
        plan: selectedFacility.survey2Plan,
        color: 'blue'
      },
      { 
        title: '3차 조사', 
        method: selectedFacility.survey3Method, 
        check: selectedFacility.survey3Check, 
        plan: selectedFacility.survey3Plan,
        color: 'indigo'
      }
    ];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <ClipboardList className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedFacility.name}</h3>
                <p className="text-sm text-slate-400 font-medium">{selectedFacility.category} • 조사 이력 상세</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedFacility(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div className="space-y-8">
              {rounds.map((round, idx) => (
                <div key={idx} className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-1.5 h-6 rounded-full bg-${round.color}-500`}></div>
                    <h4 className="text-lg font-bold text-slate-700">{round.title}</h4>
                  </div>
                  
                  <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 w-1/4">구분</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-4 px-4 bg-slate-50/30 text-sm font-bold text-slate-600">조사방법</td>
                          <td className="py-4 px-4 text-sm text-slate-600 leading-relaxed">{round.method}</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-4 bg-slate-50/30 text-sm font-bold text-slate-600">확인사항</td>
                          <td className="py-4 px-4 text-sm text-slate-600 leading-relaxed">{round.check}</td>
                        </tr>
                        <tr>
                          <td className="py-4 px-4 bg-slate-50/30 text-sm font-bold text-slate-600">이행계획</td>
                          <td className="py-4 px-4 text-sm text-slate-600 leading-relaxed font-medium text-emerald-700">{round.plan}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button 
              onClick={() => setSelectedFacility(null)}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  };

  const periodStats = useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    data.forEach(item => {
      if (item.surveyDate && item.surveyStatus.includes('조사완료')) {
        const date = new Date(item.surveyDate);
        if (!isNaN(date.getTime())) {
          let label = '';
          if (periodView === 'daily') {
            label = `${date.getMonth() + 1}/${date.getDate()}`;
          } else if (periodView === 'weekly') {
            const day = date.getDay() || 7;
            const startOfWeek = new Date(date);
            startOfWeek.setHours(-24 * (day - 1));
            label = `${startOfWeek.getMonth() + 1}월 ${Math.ceil(startOfWeek.getDate() / 7)}주차`;
          } else {
            label = `${date.getMonth() + 1}월`;
          }
          counts[label] = (counts[label] || 0) + 1;
        }
      }
    });

    const labels = Object.keys(counts).sort((a, b) => {
      if (periodView === 'daily') {
        const [am, ad] = a.split('/').map(Number);
        const [bm, bd] = b.split('/').map(Number);
        return am !== bm ? am - bm : ad - bd;
      }
      return a.localeCompare(b, undefined, { numeric: true });
    });
    
    return {
      labels,
      datasets: [{
        label: '조사수량',
        data: labels.map(l => counts[l]),
        backgroundColor: '#6366f1',
        borderRadius: 8,
        hoverBackgroundColor: '#4f46e5',
      }]
    };
  }, [data, periodView]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 md:px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">E</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
            친환경자동차 시설 관리 Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="text-slate-400 w-5 h-5 cursor-pointer hover:text-emerald-500 transition-colors" />
          <div className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 hidden md:block">
            <span className="text-xs font-semibold text-emerald-700">최근 업데이트: {lastUpdate}</span>
          </div>
          <Menu className="md:hidden text-slate-600 w-6 h-6" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex justify-center mb-8">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            {(['all', 'parking', 'charging'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setComplianceView(view)}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  complianceView === view 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                    : 'text-slate-500 hover:text-emerald-500'
                }`}
              >
                {view === 'all' ? '전체' : view === 'parking' ? '주차면수' : '충전시설'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">의무설치이행율</span>
              <span className="text-3xl font-black text-emerald-600">{overallPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${overallPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">전체시설</span>
              <span className="text-2xl font-bold text-slate-700">{data.length}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">미이행</span>
              <span className={`text-2xl font-bold ${nonCompliantCount > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                {nonCompliantCount}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">제외</span>
              <span className="text-2xl font-bold text-amber-500">
                {excludedCount}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          시설별 이행현황
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categoryStats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col items-center">
              <div className="w-full text-center mb-4">
                <h3 className="text-sm font-bold text-slate-500 truncate px-2" title={stat.category}>
                  {stat.category}
                </h3>
              </div>
              <div className="relative w-32 h-32 mb-4">
                <Doughnut 
                  data={{
                    datasets: [{
                      data: [stat.compliant, stat.nonCompliant, stat.excluded],
                      backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                      borderWidth: 0,
                    }]
                  }}
                  options={{ 
                    cutout: '80%',
                    plugins: { 
                      tooltip: {
                        enabled: true,
                        callbacks: {
                          label: (context) => {
                            const labels = ['이행', '미이행', '제외'];
                            return `${labels[context.dataIndex]}: ${context.raw}`;
                          }
                        }
                      },
                      datalabels: { display: false }
                    },
                    maintainAspectRatio: true
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-700">{stat.percentage.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex justify-between w-full px-2 mt-4">
                <div className="flex flex-col items-center bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex-1 mx-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">이행</span>
                  <span className="text-sm font-black text-emerald-700">{stat.compliant}</span>
                </div>
                <div className="flex flex-col items-center bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 flex-1 mx-1">
                  <span className="text-[10px] font-bold text-rose-600 uppercase mb-0.5">미이행</span>
                  <span className="text-sm font-black text-rose-700">{stat.nonCompliant}</span>
                </div>
                <div className="flex flex-col items-center bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex-1 mx-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">제외</span>
                  <span className="text-sm font-black text-amber-700">{stat.excluded}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Section: 조사완료시설 이행현황 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">조사완료시설 이행율</span>
              <span className="text-3xl font-black text-blue-600">{surveyedOverallPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${surveyedOverallPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">조사완료시설</span>
              <span className="text-2xl font-bold text-slate-700">{surveyedData.length}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">이행완료</span>
              <span className="text-2xl font-bold text-blue-600">
                {surveyedCompliantCount}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          조사완료시설별 이행현황
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {surveyedCategoryStats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col items-center">
              <div className="w-full text-center mb-4">
                <h3 className="text-sm font-bold text-slate-500 truncate px-2" title={stat.category}>
                  {stat.category}
                </h3>
              </div>
              <div className="relative w-32 h-32 mb-4">
                <Doughnut 
                  data={{
                    datasets: [{
                      data: [stat.percentage, 100 - stat.percentage],
                      backgroundColor: ['#3b82f6', '#f1f5f9'],
                      borderWidth: 0,
                    }]
                  }}
                  options={{ 
                    cutout: '80%',
                    plugins: { 
                      tooltip: { enabled: false },
                      datalabels: { display: false }
                    },
                    maintainAspectRatio: true
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-700">{stat.percentage.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex justify-between w-full px-2 mt-4">
                <div className="flex flex-col items-center bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex-1 mx-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">이행</span>
                  <span className="text-sm font-black text-blue-700">{stat.compliant}</span>
                </div>
                <div className="flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex-1 mx-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">조사완료</span>
                  <span className="text-sm font-black text-slate-700">{stat.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">실태조사 완료율</span>
              <span className="text-3xl font-black text-blue-600">{surveyPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${surveyPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">전체시설</span>
              <span className="text-2xl font-bold text-slate-700">{data.length}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">완료</span>
              <span className="text-2xl font-bold text-blue-600">
                {totalSurveyDone}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-4">
            <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
              시설별 조사현황
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {categoryStats.map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col items-center">
                  <div className="w-full text-center mb-4">
                    <h3 className="text-sm font-bold text-slate-500 truncate px-2" title={stat.category}>
                      {stat.category}
                    </h3>
                  </div>
                  <div className="relative w-32 h-32 mb-4">
                    <Doughnut 
                      data={{
                        datasets: [{
                          data: [stat.surveyPercentage, 100 - stat.surveyPercentage],
                          backgroundColor: ['#3b82f6', '#f1f5f9'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{ 
                        cutout: '80%',
                        plugins: { 
                          tooltip: { enabled: false },
                          datalabels: { display: false }
                        },
                        maintainAspectRatio: true
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-700">{stat.surveyPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between w-full px-2 mt-4">
                    <div className="flex flex-col items-center bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex-1 mx-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">완료</span>
                      <span className="text-sm font-black text-blue-700">{stat.surveyDone}</span>
                    </div>
                    <div className="flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex-1 mx-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">전체</span>
                      <span className="text-sm font-black text-slate-700">{stat.total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h3 className="text-md font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#6666CC]" />
                  기간별 조사수량
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setPeriodView(view)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        periodView === view 
                          ? 'bg-white text-[#6666CC] shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {view === 'daily' ? '일별' : view === 'weekly' ? '주별' : '월별'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[350px] w-full">
                <Bar 
                  data={periodStats} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val: any) => Number(val).toLocaleString(),
                        font: { weight: 'bold', size: 12 },
                        color: '#4D4DCC'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { weight: 'bold' } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { weight: 'bold' } }
                      }
                    },
                    layout: {
                      padding: { top: 30 }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Facility List Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
              미이행 시설 리스트
              <span className="ml-2 text-sm font-medium text-slate-400">총 {filteredList.length}개소</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="시설명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select 
                  value={filterSurvey}
                  onChange={(e) => setFilterSurvey(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                >
                  {surveyStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 pt-2 font-bold text-slate-500 text-xs uppercase tracking-wider px-4">시설 정보</th>
                  <th className="pb-4 pt-2 font-bold text-slate-500 text-xs uppercase tracking-wider px-4">주차면수 (의무/실제)</th>
                  <th className="pb-4 pt-2 font-bold text-slate-500 text-xs uppercase tracking-wider px-4">충전시설 (의무/실제)</th>
                  <th className="pb-4 pt-2 font-bold text-slate-500 text-xs uppercase tracking-wider px-4 text-center">조사여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredList.length > 0 ? (
                  filteredList.map((facility) => (
                    <tr 
                      key={facility.id} 
                      onClick={() => setSelectedFacility(facility)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{facility.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{facility.category}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-600">{facility.parkingMandate}면 / {facility.parkingInstalled}면</span>
                          <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400 rounded-full" 
                              style={{ width: `${Math.min(100, (facility.parkingInstalled / (facility.parkingMandate || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-600">{facility.chargingMandate}기 / {facility.chargingInstalled}기</span>
                          <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 rounded-full" 
                              style={{ width: `${Math.min(100, (facility.chargingInstalled / (facility.chargingMandate || 1)) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          facility.surveyStatus.includes('조사완료') 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100'
                        }`}>
                          {facility.surveyStatus.includes('조사완료') ? '조사완료' : '미완료'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <SurveyModal />

      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
        <button className="w-14 h-14 bg-white text-slate-400 rounded-2xl shadow-xl flex items-center justify-center hover:text-emerald-500 transition-all border border-slate-100">
          <Smartphone className="w-6 h-6" />
        </button>
        <button className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-emerald-200 shadow-2xl flex items-center justify-center hover:scale-105 transition-all active:scale-95 group">
          <Download className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
