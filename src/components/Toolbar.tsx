import { AppMenu } from "./AppMenu";

type ThemePreference = "light" | "dark" | "system";

type ToolbarProps = {
  currentFilePath: string | null;
  recentFiles: string[];
  reopenLastFile: boolean;
  theme: "light" | "dark";
  themePreference: ThemePreference;
  title: string;
  onNew: () => void;
  onOpen: () => void;
  onOpenRecentFile: (filePath: string) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onThemePreferenceChange: (theme: ThemePreference) => void;
  onToggleReopenLastFile: (enabled: boolean) => void;
  onToggleTheme: () => void;
};

type ActionButton = {
  label: string;
  onClick: () => void;
  icon: JSX.Element;
  variant?: "default" | "primary";
};

function IconNew() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19a2 2 0 0 1 2-2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H6a2 2 0 0 0-2 2v12Z" />
      <path d="m12 11 3 3-3 3" />
      <path d="M15 14H8" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21h14" />
      <path d="M7 21V5h8l2 2v14" />
      <path d="M9 5v5h6" />
      <path d="M9 14h6" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function IconHtml() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 9-3 3 3 3" />
      <path d="m16 9 3 3-3 3" />
      <path d="m13 7-2 10" />
    </svg>
  );
}

function IconPdf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h3" />
      <path d="M8 17h5" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function ActionButton(props: ActionButton) {
  return (
    <button
      type="button"
      className={`toolbar__action${props.variant === "primary" ? " toolbar__action--primary" : ""}`}
      onClick={props.onClick}
    >
      <span className="toolbar__action-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span>{props.label}</span>
    </button>
  );
}

export function Toolbar(props: ToolbarProps) {
  const fileActions: ActionButton[] = [
    { label: "新建", onClick: props.onNew, icon: <IconNew /> },
    { label: "打开", onClick: props.onOpen, icon: <IconOpen /> },
    { label: "保存", onClick: props.onSave, icon: <IconSave /> },
    { label: "另存为", onClick: props.onSaveAs, icon: <IconCopy /> },
  ];

  const exportActions: ActionButton[] = [
    { label: "导出 HTML", onClick: props.onExportHtml, icon: <IconHtml />, variant: "primary" },
    { label: "导出 PDF", onClick: props.onExportPdf, icon: <IconPdf />, variant: "primary" },
  ];

  const isDark = props.theme === "dark";
  const themeModeText = props.themePreference === "system" ? "随系统" : isDark ? "深色" : "浅色";
  const toolbarLogoUrl = `${import.meta.env.BASE_URL}icon.svg`;

  return (
    <header className="toolbar">
      <div className="toolbar__group toolbar__group--brand">
        <img src={toolbarLogoUrl} alt="mdshare" className="toolbar__logo" />
        <div className="toolbar__brand-block">
          <strong className="toolbar__brand">mdshare</strong>
          <span className="toolbar__title" title={props.title}>
            {props.title}
          </span>
        </div>
      </div>
      <div className="toolbar__group toolbar__group--actions">
        {fileActions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
        <span className="toolbar__divider" aria-hidden="true" />
        {exportActions.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
        <div className="theme-switch-wrap">
          <span className="theme-switch__label">{themeModeText}</span>
          <button
            type="button"
            className={`theme-switch${isDark ? " theme-switch--dark" : ""}`}
            onClick={props.onToggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
          >
            <span className="theme-switch__icon theme-switch__icon--sun" aria-hidden="true">
              <IconSun />
            </span>
            <span className="theme-switch__icon theme-switch__icon--moon" aria-hidden="true">
              <IconMoon />
            </span>
            <span className="theme-switch__thumb" aria-hidden="true">
              {isDark ? <IconMoon /> : <IconSun />}
            </span>
          </button>
        </div>
        <AppMenu
          currentFilePath={props.currentFilePath}
          recentFiles={props.recentFiles}
          reopenLastFile={props.reopenLastFile}
          themePreference={props.themePreference}
          onOpenRecentFile={props.onOpenRecentFile}
          onToggleReopenLastFile={props.onToggleReopenLastFile}
          onThemePreferenceChange={props.onThemePreferenceChange}
        />
      </div>
    </header>
  );
}
