import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LucideBarChart3, LucideActivity, LucideUsers, LucideBox, LucideArrowLeft, LucideTrendingUp } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/admin/usage';

export default function AdminUsageDashboard() {
  const [summary, setSummary] = useState({ total_cost: 0, total_tokens: 0, total_requests: 0 });
  const [byFeature, setByFeature] = useState([]);
  const [byUser, setByUser] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, fRes, uRes, tRes] = await Promise.all([
        fetch(`${API_BASE}/summary`),
        fetch(`${API_BASE}/by-feature`),
        fetch(`${API_BASE}/by-user`),
        fetch(`${API_BASE}/timeline`)
      ]);

      const [sData, fData, uData, tData] = await Promise.all([
        sRes.json(), fRes.json(), uRes.json(), tRes.json()
      ]);

      setSummary(sData);
      setByFeature(fData);
      setByUser(uData);
      setTimeline(tData);
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(val);

  if (loading) {
    return (
      <div className="admin-container loading">
        <div className="loader"></div>
        <p>Analyzing usage data...</p>
      </div>
    );
  }

  return (
    <div className="admin-usage-page">
      <Head>
        <title>Admin Dashboard | Usage & Costs</title>
      </Head>

      <div className="admin-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          <LucideArrowLeft size={18} />
          <span>Dashboard</span>
        </button>
        <h1>Usage & Model Analytics</h1>
        <p className="subtitle">Real-time visibility into LLM operations and cloud spend.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass animate-in">
          <div className="stat-icon cost"><LucideTrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="label">Total Estimated Cost</span>
            <h2 className="value">{formatCurrency(summary.total_cost)}</h2>
          </div>
        </div>
        <div className="stat-card glass animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon tokens"><LucideBox size={24} /></div>
          <div className="stat-info">
            <span className="label">Total Tokens Consumed</span>
            <h2 className="value">{summary.total_tokens.toLocaleString()}</h2>
          </div>
        </div>
        <div className="stat-card glass animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon requests"><LucideActivity size={24} /></div>
          <div className="stat-info">
            <span className="label">Total LLM Requests</span>
            <h2 className="value">{summary.total_requests.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        <section className="chart-section glass animate-in" style={{ animationDelay: '0.3s' }}>
          <header>
            <LucideBarChart3 size={20} className="header-icon" />
            <h3>Cost by Feature</h3>
          </header>
          <div className="bar-chart-container">
            {byFeature.length > 0 ? byFeature.map((item, idx) => (
              <div key={item.feature} className="bar-row">
                <div className="bar-label">
                  <span className="feature-name">{item.feature.replace(/_/g, ' ')}</span>
                  <span className="feature-cost">{formatCurrency(item.total_cost)}</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${(item.total_cost / (summary.total_cost || 1)) * 100}%`,
                      filter: `hue-rotate(${idx * 40}deg)`
                    }}
                  ></div>
                </div>
                <div className="bar-meta">{item.request_count} requests</div>
              </div>
            )) : (
              <div className="empty-state">
                <p>No feature usage recorded yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="table-section glass animate-in" style={{ animationDelay: '0.4s' }}>
          <header>
            <LucideUsers size={20} className="header-icon" />
            <h3>Top Users by Spend</h3>
          </header>
          <div className="table-wrapper">
            {byUser.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Cost</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {byUser.map(u => (
                    <tr key={u.user_id}>
                      <td className="user-id"><code>{u.user_id}</code></td>
                      <td className="user-cost">{formatCurrency(u.total_cost)}</td>
                      <td className="user-requests">{u.total_requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No active users with spend history.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .admin-usage-page {
          padding: 60px 40px;
          max-width: 1300px;
          margin: 0 auto;
          color: #f0f0f0;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          background: #050507;
          min-height: 100vh;
        }

        .admin-header {
          margin-bottom: 48px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: #888;
          padding: 10px 20px;
          border-radius: 12px;
          cursor: pointer;
          margin-bottom: 32px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.08);
          color: white;
          transform: translateX(-4px);
          border-color: rgba(255,255,255,0.2);
        }

        h1 {
          font-size: 42px;
          font-weight: 800;
          margin: 0 0 12px 0;
          letter-spacing: -1px;
          background: linear-gradient(to right, #ffffff 0%, #a1a1a1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #71717a;
          font-size: 18px;
          font-weight: 400;
        }

        .glass {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          transition: all 0.4s ease;
        }

        .glass:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 48px;
        }

        .stat-card {
          padding: 32px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 20px rgba(255,255,255,0.05);
        }

        .stat-icon.cost { background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .stat-icon.tokens { background: rgba(59, 130, 246, 0.08); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
        .stat-icon.requests { background: rgba(139, 92, 246, 0.08); color: #a855f7; border: 1px solid rgba(139, 92, 246, 0.2); }

        .stat-info .label {
          display: block;
          color: #71717a;
          font-size: 14px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .stat-info .value {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .dashboard-main {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
          align-items: start;
        }

        section {
          padding: 32px;
          min-height: 400px;
        }

        section header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 20px;
        }

        .header-icon {
          color: #3b82f6; 
        }

        section h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
        }

        .bar-chart-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #52525b;
          font-style: italic;
          background: rgba(255,255,255,0.01);
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.05);
        }

        .bar-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          font-weight: 500;
        }

        .feature-name {
          text-transform: capitalize;
          color: #d4d4d8;
        }

        .feature-cost {
          font-weight: 700;
          color: #ffffff;
        }

        .bar-track {
          height: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 6px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #a855f7);
          border-radius: 6px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .bar-meta {
          font-size: 13px;
          color: #52525b;
          font-weight: 400;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }

        th {
          text-align: left;
          padding: 16px 12px;
          color: #71717a;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 1px;
        }

        td {
          padding: 20px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          color: #d4d4d8;
        }

        code {
          background: rgba(59, 130, 246, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          color: #60a5fa;
          font-size: 13px;
          font-family: inherit;
        }

        .user-cost {
          font-weight: 700;
          color: #ffffff;
        }

        .animate-in {
          animation: slideUp 0.6s ease forwards;
          opacity: 0;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .dashboard-main {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
