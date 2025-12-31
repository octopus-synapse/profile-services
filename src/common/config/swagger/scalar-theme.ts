/**
 * Scalar Custom CSS for Swagger Documentation
 * Single Responsibility: Custom theme styling only
 */

export const SCALAR_CUSTOM_CSS = `
/* ProFile Dark Purple Theme */
:root {
  --scalar-background-1: #1a1625 !important;
  --scalar-background-2: #252033 !important;
  --scalar-background-3: #3d2e5c !important;
  --scalar-background-accent: #7c3aed !important;

  --scalar-color-1: #e9d5ff !important;
  --scalar-color-2: #c9b3ff !important;
  --scalar-color-3: #a89dc4 !important;
  --scalar-color-accent: #a78bfa !important;

  --scalar-border-color: #4c3a6e !important;

  --scalar-color-green: #8b5cf6 !important;
  --scalar-color-blue: #a855f7 !important;
  --scalar-color-orange: #c084fc !important;
  --scalar-color-red: #ef4444 !important;

  --scalar-button-1: #7c3aed !important;
  --scalar-button-1-hover: #6d28d9 !important;
  --scalar-button-1-color: #ffffff !important;
}

/* Sidebar */
.sidebar { background: #1a1625 !important; border-right: 1px solid #4c3a6e !important; }
.sidebar-search { background: #252033 !important; border: 1px solid #4c3a6e !important; }
.sidebar-search input { color: #e9d5ff !important; }
.sidebar-search input::placeholder { color: #8b7aa8 !important; }

/* Sidebar items */
[class*="sidebar"] a, [class*="sidebar"] button { color: #c9b3ff !important; }
[class*="sidebar"] a:hover, [class*="sidebar"] button:hover { background: #252033 !important; }

/* Method badges */
.scalar-api-reference [data-method="get"] {
  background: #8b5cf6 !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="post"] {
  background: #a855f7 !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="put"],
.scalar-api-reference [data-method="patch"] {
  background: #c084fc !important;
  color: #fff !important;
}
.scalar-api-reference [data-method="delete"] {
  background: #ef4444 !important;
  color: #fff !important;
}

/* Content area */
.scalar-api-reference { background: #1a1625 !important; }
.scalar-card { background: #252033 !important; border-color: #4c3a6e !important; }

/* Code blocks */
pre, code { background: #1e1a2e !important; }

/* Inputs */
input, textarea, select {
  background: #252033 !important;
  border-color: #4c3a6e !important;
  color: #e9d5ff !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #1a1625; }
::-webkit-scrollbar-thumb { background: #4c3a6e; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #6d28d9; }
`;
