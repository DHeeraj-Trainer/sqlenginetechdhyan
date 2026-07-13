import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { format } from "sql-formatter";

interface Props {
  value: string;
  onChange: (v: string) => void;
  theme: "light" | "dark";
  onRun: () => void;
  language?: string;
}

export function MonacoSqlEditor({ value, onChange, theme, onRun, language = "sql" }: Props) {
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleMount: OnMount = (editor, monaco) => {
    // Ctrl/Cmd + Enter → run.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current());
    // Shift+Alt+F → format.
    editor.addAction({
      id: "sql-format",
      label: "Format SQL",
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: (ed) => {
        const raw = ed.getValue();
        try {
          const formatted = format(raw, { language: "sql", keywordCase: "upper" });
          ed.setValue(formatted);
        } catch {
          /* ignore */
        }
      },
    });

    // Register basic SQL completions (keywords + schema names via window bridge).
    monaco.languages.registerCompletionItemProvider("sql", {
      triggerCharacters: [" ", ".", "\n"],
      provideCompletionItems: (model: import("monaco-editor").editor.ITextModel, position: import("monaco-editor").Position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const keywords = [
          "SELECT",
          "FROM",
          "WHERE",
          "GROUP BY",
          "ORDER BY",
          "HAVING",
          "JOIN",
          "LEFT JOIN",
          "RIGHT JOIN",
          "INNER JOIN",
          "ON",
          "AS",
          "LIMIT",
          "OFFSET",
          "INSERT INTO",
          "VALUES",
          "UPDATE",
          "SET",
          "DELETE",
          "CREATE TABLE",
          "DROP TABLE",
          "ALTER TABLE",
          "WITH",
          "UNION",
          "DISTINCT",
          "CASE",
          "WHEN",
          "THEN",
          "ELSE",
          "END",
        ];
        const schemaWords: string[] =
          (window as unknown as { __wb_schema_words?: string[] }).__wb_schema_words ?? [];
        return {
          suggestions: [
            ...keywords.map((k) => ({
              label: k,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: k,
              range,
            })),
            ...schemaWords.map((w) => ({
              label: w,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: w,
              range,
            })),
          ],
        };
      },
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme={theme === "dark" ? "vs-dark" : "light"}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        wordWrap: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        tabSize: 2,
      }}
    />
  );
}
