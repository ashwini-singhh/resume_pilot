import Standard from '../components/templates/Standard';
import BalancedProfessional from '../components/templates/BalancedProfessional';
import ModernTech from '../components/templates/ModernTech';
import ModernSingle from '../components/templates/ModernSingle';
import ATSStrict from '../components/templates/ATSStrict';
import MinimalPremium from '../components/templates/MinimalPremium';
import Classic from '../components/templates/Classic';
import VisualSidebar from '../components/templates/VisualSidebar';
import VisualBanner from '../components/templates/VisualBanner';
import VisualAccent from '../components/templates/VisualAccent';
import VisualCard from '../components/templates/VisualCard';

export const templateRegistry = {
  standard: {
    name: "Standard",
    component: Standard,
    icon: "assignment",
    description: "Industry-standard professional layout with centered header.",
    category: "Professional"
  },
  balanced: {
    name: "Balanced Professional",
    component: BalancedProfessional,
    icon: "dashboard_customize",
    description: "Recruiter-grade 30/70 two-column layout for maximum impact.",
    category: "Professional"
  },
  visual_sidebar: {
    name: "Color Sidebar",
    component: VisualSidebar,
    icon: "view_sidebar",
    description: "Vibrant sidebar with circular profile photo support.",
    category: "Visual"
  },
  visual_banner: {
    name: "Header Banner",
    component: VisualBanner,
    icon: "ad_units",
    description: "Bold top banner with integrated photo and title.",
    category: "Visual"
  },
  visual_accent: {
    name: "Accent Minimal",
    component: VisualAccent,
    icon: "palette",
    description: "Vivid section highlights and clean whitespace.",
    category: "Visual"
  },
  visual_card: {
    name: "Modern Cards",
    component: VisualCard,
    icon: "grid_view",
    description: "Dashboard-inspired card layout with subtle shadows.",
    category: "Visual"
  },
  modern_tech: {
    name: "Modern Tech",
    component: ModernTech,
    icon: "developer_mode",
    description: "SaaS-inspired design with card feels and accent highlights.",
    category: "Tech"
  },
  modern_single: {
    name: "Modern Single",
    component: ModernSingle,
    icon: "view_stream",
    description: "Clean, centralized single-column layout with strong hierarchy.",
    category: "Modern"
  },
  classic: {
    name: "Classic",
    component: Classic,
    icon: "description",
    description: "Traditional & Professional serif layout.",
    category: "Traditional"
  },
  ats_strict: {
    name: "ATS Optimized",
    component: ATSStrict,
    icon: "fact_check",
    description: "Strictly linear, machine-readable format for high parsing compatibility.",
    category: "Corporate"
  },
  minimal_premium: {
    name: "Minimal Premium",
    component: MinimalPremium,
    icon: "brush",
    description: "Whitespace-driven, elegant design for a high-end personal brand.",
    category: "Creative"
  }
};

export const TEMPLATE_IDS = Object.keys(templateRegistry);
