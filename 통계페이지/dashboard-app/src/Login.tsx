import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/DB.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const idSheetName = workbook.SheetNames.find(name => name.toUpperCase() === 'ID');
      
      if (!idSheetName) {
        setError('시스템 오류: ID 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const worksheet = workbook.Sheets[idSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Assuming Column A is ID (index 0) and Column B is PW (index 1)
      const users = jsonData.slice(1); 
      const user = users.find(row => String(row[0]) === id && String(row[1]) === pw);

      if (user) {
        onLogin();
      } else {
        setError('아이디 또는 비밀번호가 일치하지 않습니다.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 mb-5 text-center">
            친환경자동차 시설관리 Dashboard
          </h1>
          <img 
            src="/login_bg.jpg" 
            alt="로그인 헤더" 
            className="w-full rounded-2xl shadow-sm border border-slate-100 object-cover"
          />
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">아이디</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                placeholder="ID를 입력하세요"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                placeholder="Password를 입력하세요"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-2xl border border-rose-100 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>로그인 중...</span>
              </div>
            ) : (
              '로그인'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
