import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { debounce } from 'es-toolkit';
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import SymbolDisplay from './Display/SymbolDisplay';
import Editor from './Editor/Editor';
import { typescriptWorker } from './Editor/setupMonaco';
import type { ProjectInfo, ReplyFromWorker, UpdateFileMessage, UpdateOptionsMessage } from './worker';

const updateTsconfig = debounce((rawText: string) => {
  localStorage.setItem('tsconfigEditor', rawText);

  const message: UpdateOptionsMessage = {
    type: 'updateOptions',
    rawOptions: rawText,
  };
  typescriptWorker.postMessage(message);
}, 200);

const updateCode = debounce((newValue: string) => {
  localStorage.setItem('codeEditor', newValue);

  const model = monaco.editor.getModel(monaco.Uri.parse('file:///main.ts'));
  if (!model) return;

  const updateFile: UpdateFileMessage = {
    type: 'updateFile',
    fileName: '/main.ts',
    content: model.getValue()
  };

  typescriptWorker.postMessage(updateFile);
}, 200);

const defaultTsconfig = {
  module: 'esnext',
  moduleResolution: 'bundler'
};

export default function App() {
  const tsconfigEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const codeEditorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);

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
          break;
        }
        case 'info': {
          if (data.result) setProject(data.result);
          break;
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
      defaultValue={localStorage.getItem('codeEditor') ?? ''}
      onChange={newValue => {
        if (newValue === undefined) return;
        updateCode(newValue);
      }}
    />
  );

  const tsconfigEditor = (
    <Editor
      ref={tsconfigEditorRef}
      defaultValue={
        localStorage.getItem('tsconfigEditor') ?? JSON.stringify(defaultTsconfig, null, 2)
      }
      language='json'
      path='file:///tsconfig.json'
      onChange={newValue => {
        if (newValue === undefined) return;

        updateTsconfig(newValue);
      }}
    />
  );

  return <div style={{ padding: '5px' }}>
    <Stack direction='row' sx={{ height: '100vh' }} spacing={1}>
      <Stack direction="column" sx={{ width: '50vw' }}>
        <Stack direction="column" sx={{ height: '70vh' }}>
          <Typography>Code Editor</Typography>
          {codeEditor}
        </Stack>
        <Stack direction="column" sx={{ height: '30vh' }}>
          <Typography>tsconfig Editor</Typography>
          {tsconfigEditor}
        </Stack>
      </Stack>
      <Paper sx={{ width: '50vw' }}>
        <div style={{ padding: '5px' }}>
          <SymbolDisplay name="Test" flags={project?.flags ?? 0} escapedName={project?.escapedName ?? ''} />
        </div>
      </Paper>
    </Stack>
  </div>;
}
