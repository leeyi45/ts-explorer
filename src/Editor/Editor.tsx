import './setupMonaco';
import MonacoEditor, { type OnChange, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { forwardRef } from 'react';

export interface EditorProps {
  defaultValue?: string;
  language?: string;
  path?: string;

  onChange?: OnChange;
  onMount?: OnMount;
}

const Editor = forwardRef<editor.IStandaloneCodeEditor, EditorProps>(({ onMount, ...props }, ref) => {
  return <MonacoEditor
    {...props}
    theme='vs-dark'
    options={{
      automaticLayout: true,
      glyphMargin: false,
      minimap: {
        enabled: false
      },
      scrollbar: {
        useShadows: false
      },
      scrollBeyondLastLine: false,
    }}
    onMount={(e, m) => {
      if (typeof ref === 'function') {
        ref(e);
      } else if (ref) {
        ref.current = e;
      }

      onMount?.(e, m);
    }}
  />;
});

export default Editor;
