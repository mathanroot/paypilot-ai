import { themeQuartz, colorSchemeDark } from "ag-grid-community";

/**
 * PayPilot AI — Ultra-Realistic Enterprise FinTech AG Grid Dark Theme
 * Matches the deep space navy, glassmorphic panels, and neon-indigo/cyan aesthetic.
 */
export const paypilotGridTheme = themeQuartz
  .withPart(colorSchemeDark)
  .withParams({
    backgroundColor: "#0A0F1E",
    headerBackgroundColor: "#060A15",
    oddRowBackgroundColor: "#080D1A",
    borderColor: "rgba(255, 255, 255, 0.08)",
    rowBorder: "1px solid rgba(255, 255, 255, 0.04)",
    headerTextColor: "#94a3b8",
    textColor: "#f1f5f9",
    selectedRowBackgroundColor: "rgba(99, 102, 241, 0.20)",
    rowHoverColor: "rgba(99, 102, 241, 0.12)",
    accentColor: "#00f5ff",
    fontFamily: "inherit",
    fontSize: 12,
    borderRadius: 16,
    wrapperBorderRadius: 16,
    headerHeight: 46,
    rowHeight: 60,
  });
