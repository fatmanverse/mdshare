import { useEffect, useMemo, useRef, useState } from "react";

type EditorPaneProps = {
  value: string;
  theme: "light" | "dark";
  onChange: (value: string) => void;
};

type CodeMirrorSupport = {
  Compartment: any;
  EditorState: any;
  markdown: () => unknown;
  oneDark: unknown;
  EditorView: any;
  basicSetup: unknown;
};

let codeMirrorSupportPromise: Promise<CodeMirrorSupport | null> | null = null;

function createLightEditorTheme(EditorView: any) {
  return EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "var(--editor-bg)",
      color: "var(--text)",
    },
    ".cm-content": {
      fontFamily: '"SFMono-Regular", Consolas, monospace',
      fontSize: "14px",
      lineHeight: "1.7",
      padding: "20px",
    },
    ".cm-gutters": {
      backgroundColor: "var(--editor-bg)",
      color: "var(--muted)",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(37, 99, 235, 0.18)",
    },
  });
}

async function loadCodeMirrorSupport(): Promise<CodeMirrorSupport | null> {
  if (!codeMirrorSupportPromise) {
    codeMirrorSupportPromise = (async () => {
      try {
        const [stateModule, markdownModule, darkThemeModule, viewModule, codeMirrorModule] = await Promise.all([
          import(/* @vite-ignore */ "@codemirror/state"),
          import(/* @vite-ignore */ "@codemirror/lang-markdown"),
          import(/* @vite-ignore */ "@codemirror/theme-one-dark"),
          import(/* @vite-ignore */ "@codemirror/view"),
          import(/* @vite-ignore */ "codemirror"),
        ]);

        return {
          Compartment: stateModule.Compartment,
          EditorState: stateModule.EditorState,
          markdown: markdownModule.markdown,
          oneDark: darkThemeModule.oneDark,
          EditorView: viewModule.EditorView,
          basicSetup: codeMirrorModule.basicSetup,
        } satisfies CodeMirrorSupport;
      } catch {
        return null;
      }
    })();
  }

  return codeMirrorSupportPromise;
}

export function EditorPane(props: EditorPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<any>(null);
  const themeCompartmentRef = useRef<any>(null);
  const onChangeRef = useRef(props.onChange);
  const suppressChangeRef = useRef(false);
  const [support, setSupport] = useState<CodeMirrorSupport | null>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);

  const isCodeMirrorReady = useMemo(() => Boolean(support), [support]);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    let active = true;

    void loadCodeMirrorSupport().then((loadedSupport) => {
      if (!active) {
        return;
      }

      setSupport(loadedSupport);
      setLoadAttempted(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!support || !hostRef.current) {
      return;
    }

    const { Compartment, EditorState, EditorView, basicSetup, markdown, oneDark } = support;
    const themeCompartment = new Compartment();
    themeCompartmentRef.current = themeCompartment;

    const view = new EditorView({
      state: EditorState.create({
        doc: props.value,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          themeCompartment.of(props.theme === "dark" ? oneDark : createLightEditorTheme(EditorView)),
          EditorView.updateListener.of((update: any) => {
            if (!update.docChanged || suppressChangeRef.current) {
              return;
            }

            onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: hostRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompartmentRef.current = null;
    };
  }, [support]);

  useEffect(() => {
    const view = viewRef.current;
    if (!support || !view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (currentValue === props.value) {
      return;
    }

    suppressChangeRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: props.value,
      },
    });
    suppressChangeRef.current = false;
  }, [props.value, support]);

  useEffect(() => {
    const view = viewRef.current;
    const themeCompartment = themeCompartmentRef.current;
    if (!support || !view || !themeCompartment) {
      return;
    }

    const { EditorView, oneDark } = support;
    view.dispatch({
      effects: themeCompartment.reconfigure(props.theme === "dark" ? oneDark : createLightEditorTheme(EditorView)),
    });
  }, [props.theme, support]);

  return (
    <section className="pane pane--editor">
      <div className="pane__header">Markdown</div>
      <div className="editor-surface">
        {isCodeMirrorReady ? (
          <div ref={hostRef} className="editor-host" />
        ) : (
          <textarea
            className="editor-fallback"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            spellCheck={false}
            aria-label={loadAttempted ? "Markdown editor fallback" : "Markdown editor loading"}
          />
        )}
      </div>
    </section>
  );
}
