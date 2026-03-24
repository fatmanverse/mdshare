import { useEffect, useRef, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

type AppMenuProps = {
  currentFilePath: string | null;
  recentFiles: string[];
  reopenLastFile: boolean;
  autoSave: boolean;
  themePreference: ThemePreference;
  onOpenRecentFile: (filePath: string) => void;
  onToggleReopenLastFile: (enabled: boolean) => void;
  onToggleAutoSave: (enabled: boolean) => void;
  onThemePreferenceChange: (theme: ThemePreference) => void;
};

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

const themeLabels: Record<ThemePreference, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export function AppMenu(props: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="toolbar-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className={`toolbar__action toolbar__action--menu${isOpen ? " toolbar__action--active" : ""}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="toolbar__action-icon" aria-hidden="true">
          <IconMenu />
        </span>
        <span>菜单</span>
      </button>

      {isOpen ? (
        <div className="toolbar-menu" role="menu" aria-label="菜单栏">
          <section className="toolbar-menu__section">
            <h3 className="toolbar-menu__heading">主题</h3>
            <div className="toolbar-menu__choices">
              {(["light", "dark", "system"] as ThemePreference[]).map((mode) => {
                const active = props.themePreference === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`toolbar-menu__choice${active ? " toolbar-menu__choice--active" : ""}`}
                    onClick={() => props.onThemePreferenceChange(mode)}
                    role="menuitemradio"
                    aria-checked={active}
                  >
                    <span>{themeLabels[mode]}</span>
                    {active ? <span className="toolbar-menu__tag">当前</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="toolbar-menu__section">
            <h3 className="toolbar-menu__heading">启动</h3>
            <button
              type="button"
              className={`toolbar-menu__toggle${props.reopenLastFile ? " toolbar-menu__toggle--active" : ""}`}
              onClick={() => props.onToggleReopenLastFile(!props.reopenLastFile)}
            >
              <span className="toolbar-menu__toggle-text">
                <strong>启动时恢复上次文件</strong>
                <small>下次打开应用时自动恢复最后一个 Markdown 文件</small>
              </span>
              <span className="toolbar-menu__toggle-pill" aria-hidden="true">
                <span className="toolbar-menu__toggle-thumb" />
              </span>
            </button>
          </section>

          <section className="toolbar-menu__section">
            <h3 className="toolbar-menu__heading">保存</h3>
            <button
              type="button"
              className={`toolbar-menu__toggle${props.autoSave ? " toolbar-menu__toggle--active" : ""}`}
              onClick={() => props.onToggleAutoSave(!props.autoSave)}
            >
              <span className="toolbar-menu__toggle-text">
                <strong>自动保存已保存文件</strong>
                <small>编辑后自动写回当前 Markdown 文件，未保存的新文档不会自动落盘</small>
              </span>
              <span className="toolbar-menu__toggle-pill" aria-hidden="true">
                <span className="toolbar-menu__toggle-thumb" />
              </span>
            </button>
          </section>

          <section className="toolbar-menu__section">
            <h3 className="toolbar-menu__heading">最近打开</h3>
            {props.recentFiles.length === 0 ? (
              <p className="toolbar-menu__empty">还没有可直接打开的历史文件</p>
            ) : (
              <ul className="toolbar-menu__recent-list">
                {props.recentFiles.map((filePath) => {
                  const active = props.currentFilePath === filePath;

                  return (
                    <li key={filePath}>
                      <button
                        type="button"
                        className={`toolbar-menu__recent-button${active ? " toolbar-menu__recent-button--active" : ""}`}
                        title={filePath}
                        onClick={() => {
                          props.onOpenRecentFile(filePath);
                          setIsOpen(false);
                        }}
                      >
                        <span className="toolbar-menu__recent-name" title={getFileName(filePath)}>
                          {getFileName(filePath)}
                        </span>
                        <span className="toolbar-menu__recent-path" title={filePath}>
                          {filePath}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
