"""
Shared CSS styles for the SaaS-style Resume AI Pipeline UI.
Premium color theme with proper contrast and cohesive palette.
"""

GLOBAL_CSS = """
<style>
/* v3.2.0 - Minimalist Modern */
@import url('https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --background: #FAFAFA;
  --foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  --accent: #0052FF;
  --accent-secondary: #4D7CFF;
  --accent-foreground: #FFFFFF;
  --border: #E2E8F0;
  --card: #FFFFFF;
}

html, body, [class*="css"], p, span, div { font-family: 'Inter', sans-serif; color: var(--foreground); }
.stApp { background: var(--background); }
#MainMenu, footer, header { visibility: hidden; }
div[data-testid="stToolbar"] { display: none; }
section[data-testid="stSidebar"] { display: none; }

h1, h2, h3, .stMarkdown h1, .stMarkdown h2, .stHeadingContainer h1, .stHeadingContainer h2 {
    font-family: 'Calistoga', serif !important; font-weight: 400 !important;
    letter-spacing: -0.02em !important; color: var(--foreground) !important;
}
.stMarkdown h3, .stHeadingContainer h3 {
    font-family: 'Inter', sans-serif !important; font-weight: 600 !important; letter-spacing: -0.01em !important;
}

.gradient-text {
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    -webkit-background-clip: text; background-clip: text; color: transparent; display: inline-block;
}

.nav-logo {
    font-size: 24px; font-weight: 400; color: var(--foreground);
    letter-spacing: -0.02em; font-family: 'Calistoga', serif;
    display: flex; align-items: center; gap: 10px;
}
.nav-logo-icon {
    width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff; font-size: 18px; font-family: 'Inter', sans-serif; font-weight: 700;
    box-shadow: 0 4px 14px rgba(0,82,255,0.25);
}
.nav-right { display: flex; align-items: center; gap: 12px; }
.nav-icon-btn {
    width: 40px; height: 40px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 18px; color: var(--muted-foreground); cursor: pointer;
    transition: all 0.2s ease-out; border: 1px solid var(--border); background: var(--card);
}
.nav-icon-btn:hover { 
    background: var(--muted); color: var(--foreground); 
    transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.07);
}

div[data-testid="stPills"] button {
    padding: 8px 18px !important; border-radius: 20px !important;
    font-size: 13px !important; font-weight: 500 !important;
    transition: all 0.2s ease-out !important; margin: 0 4px !important;
}
div[data-testid="stPills"] button[data-checked="false"] {
    background: transparent !important; color: var(--muted-foreground) !important;
    border: 1px solid transparent !important;
}
div[data-testid="stPills"] button[data-checked="false"]:hover {
    background: var(--muted) !important; color: var(--foreground) !important;
}
div[data-testid="stPills"] button[data-checked="true"] {
    background: var(--foreground) !important; color: var(--card) !important;
    border: none !important; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important;
}
div[data-testid="stPills"] button[data-checked="true"]:hover { transform: translateY(-1px) !important; }

.profile-header {
    background: var(--card); border-radius: 16px; padding: 24px; margin-bottom: 24px;
    border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.04); transition: all 0.3s ease-out;
}
.profile-header:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
.profile-title { font-size: 22px; font-family: 'Calistoga', serif; color: var(--foreground); letter-spacing: -0.01em; }
.profile-sub { font-size: 13px; color: var(--muted-foreground); margin-top: 2px; }

.progress-container {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 16px 24px; margin-top: 20px;
    display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.progress-icon { font-size: 18px; }
.progress-text { font-size: 13px; font-weight: 600; color: var(--foreground); }
.progress-detail { font-size: 12px; color: var(--muted-foreground); margin-left: 6px; }
.progress-bar-bg { flex: 1; height: 8px; background: var(--muted); border-radius: 4px; overflow: hidden; }
.progress-bar-fill {
    height: 100%; background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    border-radius: 4px; transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.section-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 16px;
    padding: 24px; margin-bottom: 20px; position: relative;
    transition: all 0.3s ease-out; box-shadow: 0 4px 6px rgba(0,0,0,0.03);
}
.section-card:hover { box-shadow: 0 10px 20px rgba(0,0,0,0.06); transform: translateY(-2px); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: var(--foreground); }
.card-icon { font-size: 16px; }
.card-edit {
    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--muted-foreground); font-size: 14px;
    transition: all 0.2s ease-out; border: 1px solid transparent; background: transparent;
}
.card-edit:hover { background: var(--muted); color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.04); }

.tag {
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
    margin: 4px 6px 4px 0; border: 1px solid var(--border); color: var(--foreground); background: var(--card);
    transition: all 0.2s ease-out;
}
.tag:hover { background: var(--muted); border-color: rgba(0,82,255,0.3); transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.04); }
.tag-cat { font-size: 12px; font-weight: 600; color: var(--foreground); margin: 12px 0 6px; }

.section-badge {
    display: inline-flex; align-items: center; gap: 10px; border-radius: 24px;
    border: 1px solid rgba(0,82,255,0.2); background: rgba(0,82,255,0.04);
    padding: 6px 16px; margin-bottom: 12px;
}
.section-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
    animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
.section-badge-text { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--accent); font-weight: 600; }

button[kind="primary"], .stButton > button[kind="primary"] {
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary)) !important; color: var(--accent-foreground) !important;
    border: none !important; border-radius: 10px !important; box-shadow: 0 4px 14px rgba(0,82,255,0.2) !important;
    padding: 8px 14px !important; font-weight: 500 !important; font-size: 13px !important; transition: all 0.2s ease-out !important;
    display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;
}
button[kind="primary"]:hover, .stButton > button[kind="primary"]:hover {
    transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(0,82,255,0.35) !important; filter: brightness(110%);
}
button[kind="primary"]:active, .stButton > button[kind="primary"]:active { transform: scale(0.98) !important; }

.stButton > button {
    background: var(--card) !important; color: var(--foreground) !important;
    border: 1px solid var(--border) !important; border-radius: 10px !important; padding: 8px 14px !important;
    font-weight: 500 !important; font-size: 13px !important; transition: all 0.2s ease-out !important; box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
    display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;
}
.stButton > button:hover {
    background: var(--muted) !important; color: var(--foreground) !important; border-color: rgba(0,82,255,0.3) !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05) !important; transform: translateY(-1px) !important;
}

/* Icon-only circular buttons for card editing */
.st-icon-btn .stButton > button {
    width: 32px !important; height: 32px !important; padding: 0 !important; border-radius: 50% !important;
    min-width: 32px !important; border: 1px solid var(--border) !important;
}
.st-icon-btn .stButton > button:hover {
    background: var(--muted) !important; color: var(--accent) !important;
}

.app-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
    margin-bottom: 6px; transition: all 0.2s ease-out; cursor: pointer; border-left: 3px solid transparent;
}
.app-row:hover { background: var(--muted); transform: translateX(2px); }
.app-row.active { background: rgba(0,82,255,0.05); border-left-color: var(--accent); }
.app-avatar {
    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 13px; color: #fff; flex-shrink: 0;
}
.app-name { font-size: 13px; font-weight: 500; color: var(--foreground); flex: 1; }
.app-count { font-size: 11px; color: var(--muted-foreground); font-family: 'JetBrains Mono', monospace; }

div[data-testid="stExpander"] {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s ease-out; margin-bottom: 8px;
}
div[data-testid="stExpander"]:hover { border-color: var(--accent); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
div[data-testid="stExpander"] summary { font-size: 13px; font-weight: 600; color: var(--foreground); padding: 2px 0; }

.sidebar-label-divider {
    font-size: 10px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase;
    letter-spacing: 0.1em; margin: 20px 0 10px 10px; opacity: 0.8;
}

/* Inverted Section for Metrics */
div[data-testid="stMetric"] {
    background: var(--foreground); color: var(--card); border-radius: 14px; padding: 16px 20px; border: none;
    box-shadow: 0 10px 15px rgba(0,0,0,0.08); background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 24px 24px;
}
div[data-testid="stMetric"] label { color: var(--muted-foreground) !important; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
div[data-testid="stMetric"] div { color: var(--card) !important; font-family: 'Calistoga', serif; }

div[data-testid="stTextInput"] input, div[data-testid="stTextArea"] textarea, div[data-testid="stSelectbox"] > div > div {
    border-radius: 12px !important; border-color: var(--border) !important; background: transparent !important; transition: all 0.2s ease-out !important; height: 48px;
}
div[data-testid="stTextInput"] input:focus, div[data-testid="stTextArea"] textarea:focus, div[data-testid="stSelectbox"] > div > div:focus {
    border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(0,82,255,0.15) !important;
}

div[data-testid="stFileUploader"] {
    border: 2px dashed var(--border); border-radius: 16px; padding: 24px; transition: all 0.2s ease-out; background: var(--card);
}
div[data-testid="stFileUploader"]:hover { border-color: var(--accent); background: rgba(0,82,255,0.02); }

.resume-doc {
    background: var(--card); border-radius: 8px; padding: 64px 72px; font-family: 'Inter', sans-serif;
    font-size: 13px; line-height: 1.6; color: var(--foreground); box-shadow: 0 20px 25px rgba(0,0,0,0.1);
    min-height: 800px; max-width: 850px; margin: 0 auto;
}
.resume-doc .r-name { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 4px; color: var(--foreground); font-family: 'Calistoga', serif; letter-spacing: -0.01em; }
.resume-doc .r-contact { text-align: center; font-size: 12px; color: var(--muted-foreground); margin-bottom: 24px; font-family: 'JetBrains Mono', monospace; }
.resume-doc .r-section {
    font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid var(--foreground);
    padding-bottom: 6px; margin: 24px 0 12px; color: var(--foreground);
}
.resume-doc .r-entry-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin: 12px 0 4px; color: var(--foreground); }
.resume-doc .r-entry-sub { font-size: 13px; color: var(--muted-foreground); margin-bottom: 6px; font-weight: 500; }
.resume-doc .r-bullet { margin: 4px 0; padding-left: 16px; position: relative; font-size: 13px; color: #334155; }
.resume-doc .r-bullet::before { content: "•"; position: absolute; left: 0; font-weight: bold; color: var(--accent); }
.resume-doc .r-inline-add { background: rgba(34,197,94,0.1); color: #16a34a; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.resume-doc .r-inline-rm { background: rgba(239,68,68,0.1); color: #dc2626; padding: 2px 6px; border-radius: 4px; text-decoration: line-through; }

.sug-orig { background: rgba(239,68,68,0.05); border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 10px; font-size: 13px; color: #b91c1c; margin-bottom: 8px; }
.sug-mod { background: rgba(34,197,94,0.05); border-left: 3px solid #22c55e; padding: 12px 16px; border-radius: 10px; font-size: 13px; color: #15803d; }
.sug-same { background: var(--card); border-left: 3px solid var(--border); padding: 12px 16px; border-radius: 10px; font-size: 13px; color: var(--muted-foreground); }
.badge-accept { color: #16a34a; font-weight: 700; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.badge-reject { color: #dc2626; font-weight: 700; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.badge-pending { color: #d97706; font-weight: 700; font-size: 12px; font-family: 'JetBrains Mono', monospace; }

.danger-btn .stButton > button { background: #ef4444 !important; color: #fff !important; border: none !important; box-shadow: 0 4px 14px rgba(239,68,68,0.25) !important; }
.danger-btn .stButton > button:hover { background: #dc2626 !important; transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(239,68,68,0.35) !important; filter: brightness(110%); }

.success-btn .stButton > button { background: #22c55e !important; color: #fff !important; border: none !important; box-shadow: 0 4px 14px rgba(34,197,94,0.25) !important; }
.success-btn .stButton > button:hover { background: #16a34a !important; transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(34,197,94,0.35) !important; filter: brightness(110%); }

.talk-btn {
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    color: #fff; text-align: center; padding: 8px; border-radius: 20px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease-out; box-shadow: 0 4px 14px rgba(0,82,255,0.2); display: inline-block; width: 100%;
}
.talk-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,82,255,0.35); filter: brightness(110%); }

/* Material Icons Wrapper - Refined Apple Style */
.mat-icon, .mat-icon-apple {
    font-family: 'Material Symbols Rounded', sans-serif !important;
    font-weight: 300 !important; /* Thinner weights for that Apple look */
    font-style: normal; font-size: 16px; line-height: 1;
    display: inline-block; letter-spacing: normal; text-transform: none; 
    white-space: nowrap; word-wrap: normal;
    -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased;
    vertical-align: middle; opacity: 0.85; transition: all 0.2s ease-out;
}
.mat-icon-apple { font-size: 15px !important; opacity: 0.7; }
.mat-icon:hover, .mat-icon-apple:hover { opacity: 1; transform: scale(1.05); }

/* Apple-style Navbar Icon Buttons */
div[class*="st-key-nav_"] button {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: var(--muted-foreground) !important;
    padding: 0 !important;
    margin: 0 !important;
    min-width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
}
div[class*="st-key-nav_"] button:hover {
    background: var(--muted) !important;
    color: var(--foreground) !important;
}
</style>
"""
