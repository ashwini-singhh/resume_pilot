"""
Resume AI Pipeline — SaaS Dashboard UI (v3.1)
Run: cd resume_agent && source venv/bin/activate && streamlit run ui/app.py
"""
import sys, base64
from pathlib import Path
from datetime import datetime, date

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st
from ui.styles import GLOBAL_CSS
from ui.components import render_skill_tags, word_diff_html
from core.parser import extract_text_from_pdf
from core.matcher import extract_jd_keywords, match_bullets_to_keywords, compute_keyword_coverage, get_optimization_candidates
from core.llm_provider import LLMClient
from core.optimizer import optimize_bullet, apply_decisions
from core.resume_db import ensure_default_user_and_profile, get_user_profile
from core.condenser import trigger_condensation_and_save, save_profile_to_db
from config.config import Config

llm_config = Config()
llm_config.validate()

# ── Utilities ────────────────────────────────────────────
def sort_experience(experience_list):
    """Sort experience by end date (most recent first)."""
    def get_sort_key(exp):
        p = exp.get("period_data", {})
        if not p: return datetime.min.date()
        if p.get("is_present"): return date.max
        return p.get("end", datetime.min.date())
    
    return sorted(experience_list, key=get_sort_key, reverse=True)

def format_period(p_data):
    """Format structured period data into a display string."""
    if not p_data: return ""
    start = p_data.get("start")
    end = p_data.get("end")
    is_present = p_data.get("is_present")
    
    start_str = start.strftime("%b %Y") if start else "Unknown"
    end_str = "Present" if is_present else (end.strftime("%b %Y") if end else "Unknown")
    return f"{start_str} — {end_str}"
# ── Page config ──────────────────────────────────────────
st.set_page_config(page_title="ResumeAI", page_icon="✦", layout="wide", initial_sidebar_state="collapsed")
st.markdown(GLOBAL_CSS, unsafe_allow_html=True)

# ── Session state defaults ───────────────────────────────
_defaults = {
    "page": "dashboard", "resume_text": "", "pdf_bytes": None, "jd_text": "",
    "github_url": "", "suggestions": [], "sections": {}, "bullets": [],
    "jd_keywords": [], "coverage": {}, "resume_items": [], "pipeline_run": False,
    "llm_provider": "gemini", "llm_api_key": "AIzaSyBkOwwG6DoszkQnGiw5AnIXHFUa7w4jBAw", "llm_base_url": "https://generativelanguage.googleapis.com/v1beta", "llm_model": "gemini-2.0-flash",
    "editing_section": None,
    "profile": {
        "name": "", "email": "", "phone": "", "location": "",
        "links": [], "skills": {}, "experience": [], "projects": [],
        "education": [], "certifications": [], "custom_sections": [],
        "section_order": ["Work Experience", "Projects", "Education", "Skills", "Certifications"],
    },
    "applications": [],
}

# Ensure Database has the default profile loaded on first run
ensure_default_user_and_profile(_defaults["profile"])

# Load true profile and ensure mission-critical keys exist (Migration)
p_db = get_user_profile()
if p_db and "section_order" not in p_db:
    p_db["section_order"] = ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
    save_profile_to_db(1, p_db) # Persist the migration
_defaults["profile"] = p_db

for k, v in _defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v
    elif k == "profile" and "section_order" not in st.session_state["profile"]:
        # Secondary migration check for existing session states
        st.session_state["profile"]["section_order"] = ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
        save_profile_to_db(1, st.session_state["profile"])

# ── Dialogs ─────────────────────────────────────────────
@st.dialog("Upload Resume")
def upload_resume_dialog():
    st.write("Upload a PDF resume or paste the text content below.")
    uploaded_file = st.file_uploader("Choose a PDF file", type="pdf")
    pasted_text = st.text_area("Or paste resume text here", height=200)
    
    if st.button("Submit", type="primary", use_container_width=True):
        # if not st.session_state.get("llm_api_key"):
        #     st.error("Please set your API Key in the 'AI Optimize' tab first.")
        #     return
            
        final_text = ""
        if uploaded_file:
            with st.spinner("Extracting text from PDF..."):
                try:
                    pdf_bytes = uploaded_file.read()
                    final_text = extract_text_from_pdf(pdf_bytes)
                except Exception as e:
                    st.error(f"Error reading PDF: {e}")
                    return
        elif pasted_text.strip():
            final_text = pasted_text.strip()
        else:
            st.warning("Please upload a file or paste text.")
            return

        with st.spinner("AI is parsing and structuring your resume..."):
            try:
                # Parse into structured Master Profile
                new_profile = trigger_condensation_and_save(llm_config, 1, pdf_text=final_text)
                st.session_state["profile"] = new_profile
                st.success("Resume parsed successfully!")
                st.rerun()
            except Exception as e:
                st.error(f"Error parsing resume: {e}")

@st.dialog("Settings")
def settings_dialog():
    st.markdown("##### 🧠 LLM Configuration")
    provider = st.selectbox("Provider", ["gemini", "openai", "groq", "together", "ollama", "custom"], key="llm_provider")
    st.text_input("API Key", type="password", key="llm_api_key")
    presets = LLMClient.PRESETS.get(provider, {})
    st.text_input("Base URL", value=presets.get("base_url", ""), key="llm_base_url")
    st.text_input("Model", value=presets.get("default_model", ""), key="llm_model")
    if st.button("Save & Close", type="primary", use_container_width=True):
        st.rerun()
        
    st.divider()
    st.markdown("##### ⚠️ Danger Zone")
    st.markdown("<p style='font-size:12px;color:#64748b;margin-bottom:15px;'>Resetting will permanently delete your Master Profile and all data sources. This action cannot be undone.</p>", unsafe_allow_html=True)
    if st.checkbox("I understand and want to reset everything", key="confirm_reset_check"):
        if st.button("RESET ALL DATA", type="primary", use_container_width=True):
             from core.resume_db import reset_all_data
             reset_all_data(1) # Hardcoded user_id=1 for this version
             # Standard blank profile template
             st.session_state["profile"] = {
                 "name": "", "email": "", "phone": "", "location": "",
                 "links": [], "skills": {}, "experience": [], "projects": [],
                 "education": [], "certifications": [], "custom_sections": [],
             }
             st.success("All data cleared successfully! Refreshing...")
             st.rerun()

@st.dialog("Manage Sections")
def section_manager_dialog():
    p = st.session_state["profile"]
    all_available = ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
    
    st.markdown("##### 🧱 Enable Sections")
    selected = st.multiselect("Visible Sections", all_available, default=p["section_order"], help="Remove to hide, add to show. Dragging is simulated by the order of selection.")
    
    st.markdown("##### ↕️ Reorder Sections")
    current_order = list(selected)
    for i, item in enumerate(current_order):
        c1, c2, c3 = st.columns([10, 1.2, 1.2], gap="small", vertical_alignment="center")
        c1.markdown(f'<div style="font-size:13px;font-weight:600;padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;display:flex;align-items:center;"><span style="color:#94a3b8;margin-right:8px;">☰</span> {item}</div>', unsafe_allow_html=True)
        if i > 0:
            if c2.button("↑", key=f"up_{i}", use_container_width=True):
                current_order[i], current_order[i-1] = current_order[i-1], current_order[i]
                p["section_order"] = current_order
                save_profile_to_db(1, p)
                st.rerun()
        if i < len(current_order) - 1:
            if c3.button("↓", key=f"down_{i}", use_container_width=True):
                current_order[i], current_order[i+1] = current_order[i+1], current_order[i]
                p["section_order"] = current_order
                save_profile_to_db(1, p)
                st.rerun()
                
    if st.button("Apply & Close", type="primary", use_container_width=True):
        p["section_order"] = current_order
        save_profile_to_db(1, p)
        st.rerun()

# ── Top Navbar (Native Streamlit) ────────────────────────────────────
nav_col1, nav_col2, nav_col3 = st.columns([1.5, 3, 1.5], vertical_alignment="center")

with nav_col1:
    st.markdown("""
        <div class="nav-logo" style="padding-left: 10px;">
            <span class="nav-logo-icon">R</span> ResumeAI
        </div>
    """, unsafe_allow_html=True)

with nav_col2:
    page_options = {"dashboard": "Dashboard", "preview": "Resume Preview", "ai": "AI Optimize"}
    # Reverse map for pills
    rev_options = list(page_options.values())
    current_page = st.session_state.get("page", "dashboard")
    current_label = page_options.get(current_page, "Dashboard")
    
    # Custom CSS to center pills
    st.markdown('<style>div[data-testid="stPills"] { justify-content: center; }</style>', unsafe_allow_html=True)
    
    selected_label = st.pills("Navigation", rev_options, default=current_label, label_visibility="collapsed")
    if selected_label and selected_label != current_label:
        for k, v in page_options.items():
            if v == selected_label:
                st.session_state["page"] = k
                st.rerun()

with nav_col3:
    # Balanced weights to prevent icon overlap
    v1, v2, v3, v4 = st.columns([1.5, 0.4, 0.4, 0.4], vertical_alignment="center",gap="small")
    with v2:
        st.button(":material/notifications:", key="nav_notif", help="Notifications")
    with v3:
        if st.button(":material/settings:", key="nav_settings", help="Settings"):
            settings_dialog()
    with v4:
        st.button(":material/help:", key="nav_help", help="Help")

st.markdown("<hr style='margin-top: 0px; margin-bottom: 25px; border:0; border-top: 1px solid #e5e7eb;'/>", unsafe_allow_html=True)

page = st.session_state.get("page", "dashboard")

# ══════════════════════════════════════════════════════════
# PAGE: DASHBOARD
# ══════════════════════════════════════════════════════════
if page == "dashboard":
    col_side, col_main = st.columns([1, 4], gap="small")

    # ── LEFT SIDEBAR ─────────────────────────────────────
    with col_side:
        st.markdown('<div class="section-badge" style="margin-left: 10px;"><span class="section-badge-dot"></span><span class="section-badge-text">Action Required</span></div>', unsafe_allow_html=True)

        for i, app in enumerate(st.session_state["applications"]):
            sc = {"green": "#22c55e", "yellow": "#f59e0b", "red": "#ef4444"}.get(app.get("status"), "#f59e0b")
            active_bg = "#eef2ff" if i == 0 else "#fff"
            active_border = "#6366f1" if i == 0 else "transparent"
            st.markdown(
                f'<div class="app-row{"  active" if i==0 else ""}" style="background:{active_bg};border-left-color:{active_border};">'
                f'<div class="app-avatar" style="background:{app["color"]};">{app["name"][0]}</div>'
                f'<span class="app-name">{app["name"]}</span>'
                f'<span class="app-count">{app.get("count","")}</span>'
                f'<div class="status-dot" style="background:{sc};"></div></div>',
                unsafe_allow_html=True
            )

        st.markdown('<div class="sidebar-label-divider">Data Sources</div>', unsafe_allow_html=True)
        with st.expander("Link GitHub", icon=":material/link:"):
            gh_url = st.text_input("GitHub URL or username", key="gh_in_side", placeholder="github.com/username")
            gh_token = st.text_input("Personal Access Token (optional)", key="gh_token_side",
                                     type="password", placeholder="For private repos & higher rate limits",
                                     help="Generate at github.com/settings/tokens → read:user, public_repo")
            max_repos = st.slider("Max repos to analyse", 1, 20, 8, key="gh_max_repos")

            _defaults_gh = {"gh_fetched_data": None, "gh_projects": [], "gh_new_skills": {}}
            for k, v in _defaults_gh.items():
                if k not in st.session_state:
                    st.session_state[k] = v

            # ── Step 1: Fetch repos ──────────────────────────────
            if st.button("① Fetch Repos", key="gh_fetch_btn", use_container_width=True):
                if not gh_url.strip():
                    st.error("Enter a GitHub URL or username")
                else:
                    progress_placeholder = st.empty()
                    def _prog(msg): progress_placeholder.caption(msg)
                    with st.spinner("Connecting to GitHub…"):
                        from core.github import fetch_github_profile as _fetch_gh
                        data = _fetch_gh(gh_url, token=gh_token or None,
                                         max_repos=max_repos, on_progress=_prog)
                    progress_placeholder.empty()
                    if not data:
                        st.error("Could not fetch profile. Check the URL / token.")
                    else:
                        st.session_state["gh_fetched_data"] = data
                        st.session_state["gh_projects"] = []
                        st.session_state["gh_new_skills"] = {}
                        st.success(f"✓ Found {len(data['repos'])} repos for @{data['username']}")
                        st.rerun()

            # ── Show fetched repos summary ───────────────────────
            gd = st.session_state.get("gh_fetched_data")
            if gd:
                st.markdown(f'<div style="font-size:11px;color:#64748b;margin:6px 0;">'
                            f'<b>@{gd["username"]}</b> · {gd["public_repos"]} public repos · '
                            f'{gd["followers"]} followers</div>', unsafe_allow_html=True)
                if gd.get("bio"):
                    st.caption(gd["bio"])

                # Languages preview
                if gd.get("languages"):
                    lang_pills = " ".join(
                        f'<span style="background:#f1f5f9;border-radius:4px;padding:2px 7px;font-size:10px;color:#475569;">{l}</span>'
                        for l in gd["languages"][:8]
                    )
                    st.markdown(f'<div style="margin:4px 0;">{lang_pills}</div>', unsafe_allow_html=True)

                # Repo list
                st.markdown('<div style="font-size:11px;font-weight:600;color:#94a3b8;margin:8px 0 4px;">REPOSITORIES</div>', unsafe_allow_html=True)
                for repo in gd["repos"]:
                    stars = f"⭐ {repo['stars']}" if repo['stars'] else ""
                    lang = f" · {repo['language']}" if repo['language'] else ""
                    st.markdown(
                        f'<div style="font-size:11px;color:#334155;margin:2px 0;padding:4px 6px;background:#f8fafc;border-radius:4px;">'
                        f'<b>{repo["name"]}</b>{lang} {stars}<br>'
                        f'<span style="color:#94a3b8;font-size:10px;">{(repo["description"] or "")[:80]}</span></div>',
                        unsafe_allow_html=True
                    )

                # ── Step 2: Process READMEs with LLM ────────────────
                if st.button("② Extract Projects & Skills with AI", key="gh_process_btn", use_container_width=True):
                    if not st.session_state.get("llm_api_key"):
                        st.error("Set your API Key in the AI Optimize tab first.")
                    else:
                        from core.github import summarise_repo_for_resume
                        client = LLMClient(
                            api_key=st.session_state["llm_api_key"],
                            provider=st.session_state["llm_provider"],
                            model=st.session_state.get("llm_model", ""),
                        )
                        extracted_projects = []
                        new_skills: dict = {}
                        prog = st.progress(0, text="Processing repos…")
                        total = len(gd["repos"])
                        for i, repo in enumerate(gd["repos"]):
                            prog.progress((i + 1) / total, text=f"Reading {repo['name']}…")
                            entry = summarise_repo_for_resume(repo, client)
                            extracted_projects.append(entry)
                            for skill in entry.get("skills", []):
                                new_skills[skill] = True
                        prog.empty()
                        st.session_state["gh_projects"] = extracted_projects
                        st.session_state["gh_new_skills"] = new_skills
                        st.rerun()

                # ── Preview extracted projects ───────────────────────
                gh_projects = st.session_state.get("gh_projects", [])
                if gh_projects:
                    st.markdown('<div style="font-size:11px;font-weight:600;color:#94a3b8;margin:10px 0 4px;">EXTRACTED PROJECTS (preview)</div>', unsafe_allow_html=True)
                    for ep in gh_projects:
                        st.markdown(
                            f'<div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:6px 8px;border-radius:4px;margin:4px 0;">'
                            f'<b style="font-size:11px;color:#166534;">{ep["name"]}</b><br>'
                            f'<span style="font-size:10px;color:#475569;">{"  •  ".join(ep.get("bullets", [])[:2])}</span></div>',
                            unsafe_allow_html=True
                        )

                    new_skills_list = list(st.session_state.get("gh_new_skills", {}).keys())
                    if new_skills_list:
                        st.markdown('<div style="font-size:11px;font-weight:600;color:#94a3b8;margin:8px 0 4px;">NEW SKILLS DETECTED</div>', unsafe_allow_html=True)
                        pills = " ".join(
                            f'<span style="background:#ede9fe;color:#7c3aed;border-radius:4px;padding:2px 7px;font-size:10px;">{s}</span>'
                            for s in new_skills_list[:20]
                        )
                        st.markdown(f'<div>{pills}</div>', unsafe_allow_html=True)

                    # ── Step 3: Merge ────────────────────────────────────
                    if st.button("③ Merge into My Profile", key="gh_merge_btn", type="primary", use_container_width=True):
                        prof = st.session_state["profile"]
                        # Add projects (skip duplicates by name)
                        existing_names = {pr["name"].lower() for pr in prof.get("projects", [])}
                        added = 0
                        for ep in gh_projects:
                            if ep["name"].lower() not in existing_names:
                                prof.setdefault("projects", []).append({
                                    "name": ep["name"],
                                    "bullets": ep.get("bullets", []),
                                    "link": ep.get("link", {}),
                                })
                                added += 1
                        # Add skills to "GitHub Projects" category
                        extracted_skills = list(st.session_state.get("gh_new_skills", {}).keys())
                        if extracted_skills:
                            # Group under existing categories if possible, else new category
                            from_github_cat = "GitHub Technologies"
                            prof.setdefault("skills", {})[from_github_cat] = extracted_skills
                        # Save
                        from core.condenser import save_profile_to_db
                        save_profile_to_db(1, prof)
                        st.session_state["profile"] = prof
                        st.session_state["gh_fetched_data"] = None
                        st.session_state["gh_projects"] = []
                        st.session_state["gh_new_skills"] = {}
                        st.success(f"✓ Added {added} projects and {len(extracted_skills)} skills!")
                        st.rerun()

        with st.expander("Add Context", icon=":material/add_circle:"):
            manual_text = st.text_area("Experience/Certs", key="man_in_side", height=80, placeholder="Paste achievements here...")
            if st.button("Merge Context", key="man_btn_side", use_container_width=True):
                if not st.session_state.get("llm_api_key"): st.error("Set API Key in AI Optimize")
                else:
                    with st.spinner("Merging..."):
                        client = LLMClient(api_key=st.session_state["llm_api_key"], provider=st.session_state["llm_provider"])
                        new_p = trigger_condensation_and_save(client, 1, manual_data={"text": manual_text})
                        st.session_state["profile"] = new_p; st.rerun()

        st.markdown("---")
        st.markdown('<div class="talk-btn" style="margin-top:12px;"><span class="mat-icon-apple" style="margin-right:6px;">chat</span> Talk to us</div>', unsafe_allow_html=True)

    # ── MAIN CONTENT ─────────────────────────────────────
    with col_main:
        p = st.session_state["profile"]

        # Profile header with FUNCTIONAL buttons
        ph1, ph2 = st.columns([1, 1.2])
        with ph1:
            st.markdown(f'<div style="font-size:18px;font-weight:700;color:#1e293b;">{p.get("name", "Master Profile")}</div><div style="font-size:12px;color:#94a3b8;">Manage your resume and context.</div>', unsafe_allow_html=True)
        with ph2:
            bc1, bc2, bc3 = st.columns(3)
            with bc1:
                st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
                if st.button("Preview", key="hdr_preview", icon=":material/visibility:", use_container_width=True):
                    st.session_state["page"] = "preview"; st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)
            with bc2:
                st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
                if st.button("Upload", key="hdr_upload", icon=":material/upload:", use_container_width=True):
                    upload_resume_dialog()
                st.markdown('</div>', unsafe_allow_html=True)
            with bc3:
                st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
                if st.button("Original", key="hdr_orig", icon=":material/description:", use_container_width=True):
                    st.session_state["page"] = "preview"; st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)

        # Progress bar
        def calc_completion(prof):
            fields = ['name', 'email', 'phone', 'location']
            filled = sum(1 for f in fields if prof.get(f))
            if prof.get('experience'): filled += 1
            if prof.get('skills'): filled += 1
            if prof.get('education'): filled += 1
            total = len(fields) + 3
            return int((filled / total) * 100)

        pct = calc_completion(p)
        st.markdown(
            f'<div class="progress-container"><span class="progress-icon"><span class="mat-icon-apple" style="color:{"#22c55e" if pct==100 else "#f59e0b"};">{"check_circle" if pct==100 else "warning"}</span></span>'
            f'<span class="progress-text">Profile {pct}% Complete</span>'
            f'<span class="progress-detail">{0 if pct==100 else "Some fields missing"}</span>'
            f'<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:{pct}%"></div></div></div>',
            unsafe_allow_html=True
        )
        st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

        # ── Two-column card layout ───────────────────────
        # --- Section Manager Trigger ---
        sm_col1, sm_col2 = st.columns([1, 1])
        with sm_col2:
            st.markdown('<div style="text-align:right;">', unsafe_allow_html=True)
            if st.button("Manage Sections", icon=":material/sort:", key="manage_sections_btn"):
                section_manager_dialog()
            st.markdown('</div>', unsafe_allow_html=True)

        def render_personal_info():
            p = st.session_state["profile"]
            if st.session_state["editing_section"] == "Personal Info":
                with st.container(border=True):
                    st.markdown('<div class="card-title" style="margin-bottom:12px;"><span class="mat-icon-apple">person</span> Edit Personal Info</div>', unsafe_allow_html=True)
                    p["name"] = st.text_input("Name", p["name"])
                    p["email"] = st.text_input("Email", p["email"])
                    p["phone"] = st.text_input("Phone", p["phone"])
                    p["location"] = st.text_input("Location", p["location"])
                    st.markdown('<div style="font-size:11px;color:#94a3b8;font-weight:600;margin-top:10px;margin-bottom:6px;">LINKS — Display Name + URL</div>', unsafe_allow_html=True)
                    raw_links = p.get("links", [])
                    norm_links = [l if isinstance(l, dict) else {"name": l, "url": ""} for l in raw_links]
                    while len(norm_links) < 5: norm_links.append({"name": "", "url": ""})
                    new_links = []
                    for li in range(5):
                        lc1, lc2 = st.columns(2)
                        with lc1: lname = st.text_input(f"Label {li+1}", norm_links[li]["name"], key=f"link_name_{li}")
                        with lc2: lurl = st.text_input(f"URL {li+1}", norm_links[li]["url"], key=f"link_url_{li}")
                        new_links.append({"name": lname.strip(), "url": lurl.strip()})
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        if st.button("Cancel", key="cancel_pi"): st.session_state["editing_section"] = None; st.rerun()
                    with sc2:
                        if st.button("Save", key="save_pi", type="primary"):
                            p["links"] = [l for l in new_links if l["name"] or l["url"]]
                            save_profile_to_db(1, p); st.session_state["editing_section"] = None; st.rerun()
            else:
                with st.container(border=True):
                    t_col, b_col = st.columns([10, 1])
                    with t_col: st.markdown('<div class="card-title"><span class="mat-icon-apple">person</span> Personal Information</div>', unsafe_allow_html=True)
                    with b_col:
                        if st.button("", key="edit_pi", icon=":material/edit:"): st.session_state["editing_section"] = "Personal Info"; st.rerun()
                    link_items = p.get("links", [])
                    def _link_html(l):
                        if isinstance(l, dict):
                            name, url = l.get("name") or l.get("url", ""), l.get("url", "")
                            href = f' href="{url}" target="_blank"' if url else ""
                            return f'<a{href} style="text-decoration:none;"><span class="tag" style="color:#6366f1;background:#eef2ff;">🔗 {name}</span></a>'
                        return f'<span class="tag" style="color:#6366f1;background:#eef2ff;">🔗 {l}</span>'
                    links_html = " ".join(_link_html(l) for l in link_items if (l if isinstance(l, str) else l.get("name") or l.get("url")))
                    st.markdown(f'<div style="font-size:14px;font-weight:700;color:#1e293b;">{p["name"]}</div>'
                                f'<div style="font-size:12px;color:#64748b;">📧 {p["email"]} · 📱 {p["phone"]} · 📍 {p["location"]}</div>'
                                + (f'<div style="margin-top:10px;">{links_html}</div>' if links_html else ""), unsafe_allow_html=True)

        def render_work_experience():
            p = st.session_state["profile"]
            if st.session_state["editing_section"] == "Work Experience":
                with st.container(border=True):
                    st.markdown('<div class="card-title" style="margin-bottom:12px;"><span class="mat-icon-apple">work</span> Edit Experience</div>', unsafe_allow_html=True)
                    remove_exp_idx = None
                    for idx, exp in enumerate(p["experience"]):
                        rc1, rc2 = st.columns([11, 1])
                        with rc1: st.markdown(f'<div style="font-size:11px;font-weight:600;color:#6366f1;">ENTRY {idx+1}</div>', unsafe_allow_html=True)
                        with rc2: 
                            if st.button("", key=f"del_exp_{idx}", icon=":material/delete:"): remove_exp_idx = idx
                        exp["title"] = st.text_input("Job Title", exp["title"], key=f"title_{idx}")
                        exp["company"] = st.text_input("Company", exp["company"], key=f"comp_{idx}")
                        
                        pd = exp.setdefault("period_data", {"start": date.today(), "end": date.today(), "is_present": False})
                        # Persistence handling for JSON serialization
                        if isinstance(pd.get("start"), str): pd["start"] = date.fromisoformat(pd["start"])
                        if isinstance(pd.get("end"), str): pd["end"] = date.fromisoformat(pd["end"])
                        
                        dc1, dc2, dc3 = st.columns([1, 1, 1])
                        with dc1: pd["start"] = st.date_input("Start", pd["start"], key=f"start_{idx}")
                        with dc2: 
                            pd["is_present"] = st.checkbox("Current Role", pd["is_present"], key=f"pres_{idx}")
                            if not pd["is_present"]:
                                pd["end"] = st.date_input("End", pd["end"], key=f"end_{idx}")
                        with dc3: st.caption("Period Preview"); st.write(format_period(pd))
                        exp["period"] = format_period(pd)

                        bullets_text = "\n".join(exp["bullets"])
                        new_bullets = st.text_area("Achievements", bullets_text, key=f"bull_{idx}", height=100)
                        exp["bullets"] = [b.strip() for b in new_bullets.split("\n") if b.strip()]
                        
                        if st.button(f"＋ Add Project", key=f"add_p_{idx}"):
                            exp.setdefault("projects", []).append({"name": "", "bullets": []}); st.rerun()
                        for p_idx, proj in enumerate(exp.get("projects", [])):
                            with st.container(border=True):
                                pc1, pc2 = st.columns([10, 1])
                                with pc1: proj["name"] = st.text_input("Project Name", proj["name"], key=f"exp_{idx}_p_n_{p_idx}")
                                with pc2: 
                                    if st.button("", key=f"exp_{idx}_del_p_{p_idx}", icon=":material/delete:"):
                                        exp["projects"].pop(p_idx); st.rerun()
                                pb = st.text_area("Project Bullets", "\n".join(proj["bullets"]), key=f"exp_{idx}_p_b_{p_idx}", height=80)
                                proj["bullets"] = [b.strip() for b in pb.split("\n") if b.strip()]
                        st.divider()

                    if remove_exp_idx is not None: p["experience"].pop(remove_exp_idx); st.rerun()
                    if st.button("＋ Add Work Experience", key="add_exp_main", use_container_width=True):
                        p["experience"].append({"title": "", "company": "", "bullets": []}); st.rerun()
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        if st.button("Cancel", key="cancel_work"): st.session_state["editing_section"] = None; st.rerun()
                    with sc2:
                        if st.button("Save", key="save_work_main", type="primary"):
                            # Convert dates back to strings for JSON save
                            for e in p["experience"]:
                                if "period_data" in e:
                                    e["period_data"]["start"] = e["period_data"]["start"].isoformat()
                                    if not e["period_data"].get("is_present"):
                                        e["period_data"]["end"] = e["period_data"]["end"].isoformat()
                            p["experience"] = sort_experience([e for e in p["experience"] if e.get("title") or e.get("company")])
                            save_profile_to_db(1, p); st.session_state["editing_section"] = None; st.rerun()
            else:
                with st.container(border=True):
                    t_col, b_col = st.columns([10, 1])
                    with t_col: st.markdown('<div class="card-title"><span class="mat-icon-apple">work</span> Work Experience</div>', unsafe_allow_html=True)
                    with b_col:
                        if st.button("", key="edit_work_main", icon=":material/edit:"): st.session_state["editing_section"] = "Work Experience"; st.rerun()
                    p["experience"] = sort_experience(p["experience"])
                    for exp in p["experience"]:
                        bullets_li = "".join(f"<li>{b}</li>" for b in exp["bullets"][:2])
                        projects_html = ""
                        for proj in exp.get("projects", []):
                            pb = "".join(f"<li>{b}</li>" for b in proj["bullets"][:1])
                            projects_html += f'<div style="margin-top:8px;padding-left:12px;border-left:2px solid #e2e8f0;font-size:11px;"><div style="font-weight:600;">🔹 Project: {proj["name"]}</div><ul style="margin:2px 0;padding-left:16px;">{pb}</ul></div>'
                        st.markdown(f'<div style="display:flex;justify-content:space-between;margin-top:12px;"><div><strong style="color:#1e293b;">{exp["title"]}</strong><br><span style="font-size:12px;color:#64748b;">{exp["company"]}</span></div>'
                                    f'<div style="font-size:11px;color:#94a3b8;text-align:right;">{exp.get("period", "")}</div></div>'
                                    f'<ul style="margin:2px 0 6px;padding-left:16px;line-height:1.6;font-size:12px;color:#475569;">{bullets_li}</ul>' + projects_html, unsafe_allow_html=True)

        def render_projects():
            p = st.session_state["profile"]
            if st.session_state["editing_section"] == "Projects":
                with st.container(border=True):
                    st.markdown('<div class="card-title" style="margin-bottom:12px;"><span class="mat-icon-apple">folder</span> Edit Projects</div>', unsafe_allow_html=True)
                    remove_proj_idx = None
                    for idx, proj in enumerate(p["projects"]):
                        rc1, rc2 = st.columns([11, 1])
                        with rc1: st.markdown(f'<div style="font-size:11px;font-weight:600;color:#6366f1;">PROJECT {idx+1}</div>', unsafe_allow_html=True)
                        with rc2: 
                            if st.button("", key=f"del_proj_{idx}", icon=":material/delete:"): remove_proj_idx = idx
                        proj["name"] = st.text_input("Project Name", proj["name"], key=f"proj_n_{idx}")
                        p_bullets = "\n".join(proj["bullets"])
                        new_p_bulls = st.text_area("Details", p_bullets, key=f"proj_b_{idx}", height=80)
                        proj["bullets"] = [b.strip() for b in new_p_bulls.split("\n") if b.strip()]
                        st.divider()
                    if remove_proj_idx is not None: p["projects"].pop(remove_proj_idx); st.rerun()
                    if st.button("＋ Add Project", key="add_proj_main", use_container_width=True):
                        p["projects"].append({"name": "", "bullets": []}); st.rerun()
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        if st.button("Cancel", key="cancel_proj_main"): st.session_state["editing_section"] = None; st.rerun()
                    with sc2:
                        if st.button("Save", key="save_proj_main", type="primary"):
                            p["projects"] = [pr for pr in p["projects"] if pr.get("name")]
                            save_profile_to_db(1, p); st.session_state["editing_section"] = None; st.rerun()
            else:
                with st.container(border=True):
                    t_col, b_col = st.columns([10, 1])
                    with t_col: st.markdown('<div class="card-title"><span class="mat-icon-apple">folder</span> Projects</div>', unsafe_allow_html=True)
                    with b_col:
                        if st.button("", key="edit_proj_main", icon=":material/edit:"): st.session_state["editing_section"] = "Projects"; st.rerun()
                    for proj in p["projects"]:
                        bullets_li = "".join(f"<li>{b}</li>" for b in proj["bullets"][:2])
                        st.markdown(f'<div style="font-weight:600;color:#dc2626;font-size:13px;margin-top:8px;">{proj["name"]}</div>'
                                    f'<ul style="margin:4px 0;padding-left:16px;line-height:1.7;font-size:12px;color:#475569;">{bullets_li}</ul>', unsafe_allow_html=True)

        def render_education():
            p = st.session_state["profile"]
            if st.session_state["editing_section"] == "Education":
                with st.container(border=True):
                    st.markdown('<div class="card-title" style="margin-bottom:12px;"><span class="mat-icon-apple">school</span> Edit Education</div>', unsafe_allow_html=True)
                    for idx, edu in enumerate(p["education"]):
                        edu["degree"] = st.text_input(f"Degree {idx+1}", edu["degree"], key=f"deg_{idx}")
                        edu["school"] = st.text_input(f"School {idx+1}", edu["school"], key=f"sch_{idx}")
                        edu["period"] = st.text_input(f"Period {idx+1}", edu["period"], key=f"period_edu_{idx}")
                        st.divider()
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        if st.button("Cancel", key="cancel_edu_main"): st.session_state["editing_section"] = None; st.rerun()
                    with sc2:
                        if st.button("Save", key="save_edu_main", type="primary"):
                            save_profile_to_db(1, p); st.session_state["editing_section"] = None; st.rerun()
            else:
                with st.container(border=True):
                    t_col, b_col = st.columns([10, 1])
                    with t_col: st.markdown('<div class="card-title"><span class="mat-icon-apple">school</span> Education</div>', unsafe_allow_html=True)
                    with b_col:
                        if st.button("", key="edit_edu_main", icon=":material/edit:"): st.session_state["editing_section"] = "Education"; st.rerun()
                    for edu in p["education"]:
                        st.markdown(f'<div style="display:flex;justify-content:space-between;margin-top:8px;"><div><strong style="color:#1e293b;">{edu["degree"]}</strong><br><span style="font-size:12px;color:#64748b;">{edu["school"]}</span></div>'
                                    f'<div style="font-size:11px;color:#94a3b8;text-align:right;">{edu["period"]}</div></div>', unsafe_allow_html=True)

        def render_skills():
            p = st.session_state["profile"]
            if st.session_state["editing_section"] == "Skills":
                with st.container(border=True):
                    st.markdown('<div class="card-title" style="margin-bottom:12px;"><span class="mat-icon-apple">bolt</span> Edit Skills</div>', unsafe_allow_html=True)
                    for cat in list(p["skills"].keys()):
                        new_tags = st.text_input(cat, ", ".join(p["skills"][cat]), key=f"sk_in_{cat}")
                        p["skills"][cat] = [t.strip() for t in new_tags.split(",") if t.strip()]
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        if st.button("Cancel", key="cancel_sk"): st.session_state["editing_section"] = None; st.rerun()
                    with sc2:
                        if st.button("Save", key="save_sk", type="primary"):
                            save_profile_to_db(1, p); st.session_state["editing_section"] = None; st.rerun()
            else:
                with st.container(border=True):
                    t_col, b_col = st.columns([10, 1])
                    with t_col: st.markdown('<div class="card-title"><span class="mat-icon-apple">bolt</span> Skills</div>', unsafe_allow_html=True)
                    with b_col:
                        if st.button("", key="edit_sk", icon=":material/edit:"): st.session_state["editing_section"] = "Skills"; st.rerun()
                    st.markdown(render_skill_tags(p["skills"]), unsafe_allow_html=True)

        def render_certs():
            p = st.session_state["profile"]
            with st.container(border=True):
                st.markdown('<div class="card-title"><span class="mat-icon-apple">workspace_premium</span> Certifications</div>', unsafe_allow_html=True)
                for c in p["certifications"]:
                    st.markdown(f'<div style="font-size:12px;color:#334155;margin-bottom:4px;">• {c}</div>', unsafe_allow_html=True)

        # ── Two-column card layout (now dynamic) ─────────
        left_sections = []
        right_sections = []
        # Assign sections to columns for balance
        for i, s in enumerate(p["section_order"]):
            if i % 2 == 0: left_sections.append(s)
            else: right_sections.append(s)
            
        c1, c2 = st.columns(2)

        def render_section(name):
            if name == "Work Experience": render_work_experience()
            elif name == "Projects": render_projects()
            elif name == "Education": render_education()
            elif name == "Skills": render_skills()
            elif name == "Certifications": render_certs()
            elif name == "Personal Info": render_personal_info() # Usually always shown or at top

        # Personal Info is special, usually always first on left
        with c1:
            render_personal_info()
            # --- Dashboard Rendering ---
            for s in left_sections:
                if s != "Personal Info": render_section(s)
        
        with c2:
            for s in right_sections:
                if s != "Personal Info": render_section(s)

        # Space
        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)

        # Space
        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
# PAGE: RESUME PREVIEW
# ══════════════════════════════════════════════════════════
elif page == "preview":
    p = st.session_state["profile"]
    col_ctrl, col_doc = st.columns([1, 3], gap="medium")

    with col_ctrl:
        st.markdown("##### <span class='mat-icon' style='font-size:20px;margin-right:8px;color:#64748b;'>palette</span> Font Styling", unsafe_allow_html=True)
        st.selectbox("Font Family", ["Inter (Modern)", "Arial", "Times New Roman", "Georgia"], key="font_fam")
        st.slider("Font Size", 9, 14, 11, key="font_sz")
        st.checkbox("Fit to one page", key="fit_page")
        if st.button("Reset to Defaults", key="reset_font", icon=":material/undo:", use_container_width=True):
            st.session_state["font_fam"] = "Inter (Modern)"
            st.session_state["font_sz"] = 11
            st.session_state["fit_page"] = False
            p["section_order"] = ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
            save_profile_to_db(1, p)
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("---")
        st.markdown("##### <span class='mat-icon' style='font-size:20px;margin-right:8px;color:#64748b;'>reorder</span> Section Order", unsafe_allow_html=True)
        st.caption("Sections appear in this order")
        for i, sec in enumerate(p["section_order"], 1):
            st.markdown(f"<div style='font-size:12px;color:#475569;padding:4px 8px;background:#f8fafc;border-radius:4px;margin-bottom:4px;border:1px solid #e2e8f0;'>{i}. {sec}</div>", unsafe_allow_html=True)
        if st.button("Manage Order", key="go_manage_sec", icon=":material/settings:", use_container_width=True):
            st.session_state["page"] = "dashboard"
            st.rerun()

        st.markdown("---")
        st.markdown("##### <span class='mat-icon' style='font-size:20px;margin-right:8px;color:#64748b;'>upload_file</span> Update Resume", unsafe_allow_html=True)
        if st.button("Upload & Parse with AI", key="prev_upload_btn", use_container_width=True, icon=":material/upload:"):
            upload_resume_dialog()

    with col_doc:
        # Toolbar with functional buttons
        tb1, tb2, tb3, tb4 = st.columns([1.5, 1, 1, 1.4])
        with tb1:
            st.markdown('<div style="font-size:18px;font-weight:700;color:#1e293b;padding-top:6px;">Resume Preview</div>', unsafe_allow_html=True)
        with tb2:
            st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
            if st.button("Edit", key="edit_resume", icon=":material/edit:", use_container_width=True):
                st.session_state["page"] = "dashboard"; st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)
        with tb3:
            st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
            st.button("Save", key="save_resume", icon=":material/save:", use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
        with tb4:
            st.markdown('<div class="danger-btn">', unsafe_allow_html=True)
            if st.button("Export PDF", key="export_pdf", icon=":material/download:", use_container_width=True):
                st.info("PDF export coming soon — use browser Print (Ctrl+P) for now.")
            st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="info-banner" style="display:flex;align-items:center;"><span class="mat-icon" style="font-size:18px;color:#3b82f6;margin-right:6px;">info</span> <div>This format is used when your resume is optimized for a job. If you skip optimization, your original resume will be submitted as-is.</div></div>', unsafe_allow_html=True)

        # Render resume document
        accepted_map = {}
        for s in st.session_state.get("suggestions", []):
            if s.get("accepted") is True and s.get("original") != s.get("modified"):
                accepted_map[s["original"]] = s["modified"]

        ff_map = {
            "Inter (Modern)": "'Inter', sans-serif", "Arial": "Arial, sans-serif",
            "Times New Roman": "'Times New Roman', serif", "Georgia": "Georgia, serif"
        }
        ff = ff_map.get(st.session_state.get("font_fam", "Inter (Modern)"), "'Inter', sans-serif")
        fs = st.session_state.get("font_sz", 11)
        scale = fs / 11.0

        dynamic_css = f"""<style>
.resume-doc {{ font-family: {ff} !important; }}
.resume-doc .r-name {{ font-size: {int(32 * scale)}px !important; }}
.resume-doc .r-contact {{ font-size: {int(12 * scale)}px !important; }}
.resume-doc .r-section {{ font-size: {int(14 * scale)}px !important; }}
.resume-doc .r-entry-header {{ font-size: {int(14 * scale)}px !important; }}
.resume-doc .r-entry-sub {{ font-size: {int(13 * scale)}px !important; }}
.resume-doc .r-bullet {{ font-size: {int(13 * scale)}px !important; }}
.resume-doc .r-skills-container {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 6px; margin-top: 6px; }}
.resume-doc .r-skills-line {{ font-size: {int(13 * scale)}px !important; }}
.resume-doc .r-skills-label {{ font-size: {int(13 * scale)}px !important; font-weight: 600; color: #1e293b; }}
</style>"""

        resume_html = f"""{dynamic_css}<div class="resume-doc">
<div class="r-name">{p['name']}</div>
<div class="r-contact">{p['email']} | {p['phone']} | github.com | linkedin.com</div>"""

        order = p["section_order"]

        for sec in order:
            if "EDU" in sec and p.get("education"):
                resume_html += '<div class="r-section">EDUCATION</div>'
                for edu in p["education"]:
                    resume_html += f"""<div class="r-entry-header"><span>{edu['school']}</span><span>{edu['period']}</span></div>
<div class="r-entry-sub">{edu['degree']}</div>
<div style="font-size:{int(11 * scale)}px;color:#64748b;">GPA: {edu['gpa']}</div>"""
            elif "SKILL" in sec and p.get("skills"):
                resume_html += '<div class="r-section">SKILLS</div><div class="r-skills-container">'
                for cat, tags in p["skills"].items():
                    resume_html += f'<div class="r-skills-line"><span class="r-skills-label">{cat}:</span> {", ".join(tags)}</div>'
                resume_html += '</div>'
            elif ("EXP" in sec or "WORK" in sec) and p.get("experience"):
                resume_html += '<div class="r-section">WORK EXPERIENCE</div>'
                for exp in p["experience"]:
                    resume_html += f'<div class="r-entry-header"><span>{exp["company"]} | {exp["title"]}</span><span>{exp["period"]}</span></div>'
                    for b in exp["bullets"]:
                        if b in accepted_map: resume_html += f'<div class="r-bullet">{word_diff_html(b, accepted_map[b])}</div>'
                        else: resume_html += f'<div class="r-bullet">{b}</div>'
            elif "PROJ" in sec and p.get("projects"):
                resume_html += '<div class="r-section">PROJECTS</div>'
                for proj in p["projects"]:
                    resume_html += f'<div class="r-entry-header"><span>{proj["name"]}</span><span></span></div>'
                    for b in proj["bullets"]:
                        if b in accepted_map: resume_html += f'<div class="r-bullet">{word_diff_html(b, accepted_map[b])}</div>'
                        else: resume_html += f'<div class="r-bullet">{b}</div>'
            elif "CERT" in sec and p.get("certifications"):
                resume_html += '<div class="r-section">CERTIFICATIONS</div>'
                for c in p["certifications"]:
                    resume_html += f'<div class="r-bullet">{c}</div>'

        resume_html += "</div>"
        st.markdown(resume_html, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
# PAGE: AI OPTIMIZE
# ══════════════════════════════════════════════════════════
elif page == "ai":
    col_input, col_results = st.columns([1, 2], gap="medium")

    with col_input:
        st.markdown("##### 📄 Job Description")
        jd = st.text_area("Paste JD", height=300, key="jd_text", placeholder="Paste the target job description...")
        github = st.text_input("GitHub (optional)", key="github_url", placeholder="https://github.com/user")
        
        # Pull LLM settings from state for the run button
        api_key = st.session_state.get("llm_api_key", "")
        provider = st.session_state.get("llm_provider", "gemini")
        base_url = st.session_state.get("llm_base_url", "")
        model = st.session_state.get("llm_model", "")
        
        run = st.button("🚀 Analyze & Optimize", key="run_ai", use_container_width=True, type="primary")

        if not api_key:
            st.info("💡 Tip: Set your API Key in the Settings (⚙️) icon top-right.")

    # Run pipeline
    if run:
        if not jd or not api_key:
            st.error("Please provide both a Job Description and API key.")
            st.stop()
        p = st.session_state["profile"]
        all_bullets = []
        for exp in p["experience"]: all_bullets.extend(exp["bullets"])
        for proj in p["projects"]: all_bullets.extend(proj["bullets"])

        try:
            client = LLMClient(api_key=api_key, base_url=base_url, model=model, provider=provider)
        except Exception as e:
            st.error(f"LLM error: {e}"); st.stop()

        jd_keywords = extract_jd_keywords(jd)
        coverage = compute_keyword_coverage(all_bullets, jd_keywords)
        match_results = match_bullets_to_keywords(all_bullets, jd_keywords)
        candidates = get_optimization_candidates(match_results)
        target_kw = coverage.get("uncovered_keywords", [])[:15]

        suggestions = []
        if candidates:
            prog = st.progress(0, text="Optimizing…")
            for i, c in enumerate(candidates):
                r = optimize_bullet(client, c["bullet"], target_kw)
                suggestions.append(r)
                prog.progress((i + 1) / len(candidates))
            prog.empty()

        st.session_state["suggestions"] = suggestions
        st.session_state["jd_keywords"] = jd_keywords
        st.session_state["coverage"] = coverage
        st.session_state["pipeline_run"] = True
        st.rerun()

    with col_results:
        if st.session_state.get("pipeline_run"):
            suggestions = st.session_state["suggestions"]
            coverage = st.session_state["coverage"]

            # Coverage metrics
            st.markdown("##### 📊 Keyword Coverage")
            pct = coverage.get("coverage_percentage", 0)
            n_sug = len([s for s in suggestions if s.get("original") != s.get("modified") and s.get("change_type") != "none"])
            n_acc = sum(1 for s in suggestions if s.get("accepted") is True)
            m1, m2, m3 = st.columns(3)
            m1.metric("Coverage", f"{pct}%")
            m2.metric("Suggestions", n_sug)
            m3.metric("Accepted", n_acc)

            covered_html = "".join(f'<span class="tag" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;">{k}</span>' for k in coverage.get("covered_keywords", [])[:20])
            missing_html = "".join(f'<span class="tag" style="background:#fee2e2;color:#991b1b;border-color:#fecaca;">{k}</span>' for k in coverage.get("uncovered_keywords", [])[:20])
            with st.expander("✅ Covered keywords"):
                st.markdown(covered_html or "_None_", unsafe_allow_html=True)
            with st.expander("❌ Missing keywords"):
                st.markdown(missing_html or "_None_", unsafe_allow_html=True)

            st.markdown("---")

            # Bulk actions
            st.markdown("##### ✅ Review Suggestions")
            b1, b2, b3 = st.columns(3)
            with b1:
                st.markdown('<div class="success-btn">', unsafe_allow_html=True)
                if st.button("✅ Accept All", key="aa", use_container_width=True):
                    for s in suggestions:
                        if s.get("original") != s.get("modified") and s.get("change_type") != "none":
                            s["accepted"] = True
                    st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)
            with b2:
                st.markdown('<div class="danger-btn">', unsafe_allow_html=True)
                if st.button("❌ Reject All", key="ra", use_container_width=True):
                    for s in suggestions:
                        if s.get("original") != s.get("modified") and s.get("change_type") != "none":
                            s["accepted"] = False
                    st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)
            with b3:
                st.markdown('<div class="secondary-btn">', unsafe_allow_html=True)
                if st.button("🔄 Reset", key="rs", use_container_width=True):
                    for s in suggestions:
                        s["accepted"] = None
                    st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)

            for idx, sug in enumerate(suggestions):
                orig, mod = sug.get("original", ""), sug.get("modified", "")
                kw = sug.get("keywords_added", [])
                has_change = orig != mod and sug.get("change_type") != "none"
                acc = sug.get("accepted")

                status = "✓ ACCEPTED" if acc is True else "✗ REJECTED" if acc is False else "● PENDING" if has_change else ""

                with st.expander(f"Bullet {idx + 1}  {status}", expanded=(has_change and acc is None)):
                    if has_change:
                        st.markdown(f'<div class="sug-orig">− {orig}</div>', unsafe_allow_html=True)
                        st.markdown(f'<div class="sug-mod">+ {mod}</div>', unsafe_allow_html=True)
                        diff = word_diff_html(orig, mod)
                        st.markdown(f'<div style="background:#f8fafc;border-radius:8px;padding:10px;margin:6px 0;font-size:12px;border:1px solid #e5e7eb;">{diff}</div>', unsafe_allow_html=True)
                        if kw:
                            st.markdown("".join(f'<span class="tag" style="background:#dcfce7;color:#166534;">{k}</span>' for k in kw), unsafe_allow_html=True)
                        a1, a2 = st.columns(2)
                        with a1:
                            st.markdown('<div class="success-btn">', unsafe_allow_html=True)
                            if st.button("✅ Accept", key=f"a_{idx}", use_container_width=True):
                                suggestions[idx]["accepted"] = True; st.rerun()
                            st.markdown('</div>', unsafe_allow_html=True)
                        with a2:
                            st.markdown('<div class="danger-btn">', unsafe_allow_html=True)
                            if st.button("❌ Reject", key=f"r_{idx}", use_container_width=True):
                                suggestions[idx]["accepted"] = False; st.rerun()
                            st.markdown('</div>', unsafe_allow_html=True)
                    else:
                        st.markdown(f'<div class="sug-same">= {orig}</div>', unsafe_allow_html=True)
                        st.caption("No changes needed.")

            st.markdown("---")

            # Final output
            st.markdown("##### 📝 Final Resume (accepted changes only)")
            p = st.session_state["profile"]
            sections = {}
            for exp in p["experience"]: sections[f"Experience - {exp['company']}"] = exp["bullets"]
            for proj in p["projects"]: sections[f"Projects - {proj['name']}"] = proj["bullets"]
            final = apply_decisions(suggestions, sections)
            st.code(final, language="text")

        else:
            st.markdown("""
            <div style="text-align:center;padding:80px 20px;">
                <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">🤖</div>
                <p style="font-size:16px;font-weight:600;color:#1e293b;">Ready to Optimize</p>
                <p style="font-size:13px;color:#94a3b8;max-width:360px;margin:8px auto;">Paste a <strong>Job Description</strong>, configure your <strong>LLM provider</strong>, and hit <strong>Analyze & Optimize</strong>.</p>
                <p style="font-size:11px;color:#cbd5e1;margin-top:16px;">Supports Gemini · OpenAI · Groq · Together · Ollama · Any OpenAI-compatible API</p>
            </div>""", unsafe_allow_html=True)

