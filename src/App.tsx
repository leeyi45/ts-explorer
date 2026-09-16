import Grid from '@mui/material/Grid';
import { debounce } from 'es-toolkit';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import Editor from './Editor/Editor';
import { typescriptWorker } from './Editor/setupMonaco';
import type { ReplyFromWorker, UpdateFileMessage, UpdateOptionsMessage } from './worker';

const updateTsconfig = debounce((rawText: string) => {
  const message: UpdateOptionsMessage = {
    type: 'updateOptions',
    rawOptions: rawText,
  };
  typescriptWorker.postMessage(message);
}, 200);

const defaultTsconfig = {
  module: 'esnext',
  moduleResolution: 'bundler'
};

export default function App() {
  const tsconfigEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const codeEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);

  useEffect(() => {
    function replyHandler({ data }: MessageEvent<ReplyFromWorker>) {
      switch (data.type) {
        case 'updateOptions': {
          const model = monaco.editor.getModel(monaco.Uri.parse('file:///tsconfig.json'));
          if (!model) return;

          monaco.editor.setModelMarkers(
            model,
            'typescript-config',
            (data.errors ?? []).map(diagnostic => {
              const start = model.getPositionAt(diagnostic.start);
              const end = model.getPositionAt(diagnostic.start + diagnostic.length);

              return {
                severity: diagnostic.category === 1
                  ? monaco.MarkerSeverity.Error
                  : monaco.MarkerSeverity.Warning,
                message: diagnostic.message,
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
                code: String(diagnostic.code)
              };
            })
          );
        }
      }
    }

    typescriptWorker.onmessage = replyHandler;

    return () => {
      typescriptWorker.onmessage = null;
    };
  }, []);

  const codeEditor = (
    <Editor
      language='typescript'
      ref={codeEditorRef}
      path='file:///main.ts'
      onChange={newValue => {
        if (newValue === undefined) return;

        localStorage.setItem('codeEditor', newValue);

        const model = monaco.editor.getModel(monaco.Uri.parse('file:///main.ts'));
        if (!model) return;

        const updateFile: UpdateFileMessage = {
          type: 'updateFile',
          fileName: model.uri.toString(),
          content: model.getValue()
        };

        typescriptWorker.postMessage(updateFile);
      }}
    />
  );

  const tsconfigEditor = (
    <Editor
      ref={tsconfigEditorRef}
      defaultValue={
        localStorage.getItem('jsonEditor') ?? JSON.stringify(defaultTsconfig, null, 2)
      }
      language='json'
      path='file:///tsconfig.json'
      onChange={newValue => {
        if (newValue === undefined) return;

        updateTsconfig(newValue);
        localStorage.setItem('jsonEditor', newValue);
      }}
    />
  );

  return <Grid
    container
    rowSpacing={1}
    sx={{ height: '100vh' }}
  >
    <Grid size={12}></Grid>
    <Grid size={6}>{codeEditor}</Grid>
    <Grid size={6} />
    <Grid size={6}>{tsconfigEditor}</Grid>
  </Grid>;
}
