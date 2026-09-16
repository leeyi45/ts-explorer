import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import tsconfigSchema from './tsconfig.schema.json' with { type: 'json' };

type MonacoEnvironmentGlobal = typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, label: string) => Worker;
  };
};

export const typescriptWorker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });

(self as MonacoEnvironmentGlobal).MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url), {
        type: 'module',
      });
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url), {
        type: 'module',
      });
    }
    return new Worker(new URL('../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url), {
      type: 'module',
    });
  },
};

monaco.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.json.jsonDefaults.setDiagnosticsOptions({
  validate: true,
  enableSchemaRequest: true,
  schemas: [
    {
      uri: 'compilerOptions-schema',
      fileMatch: ['file:///tsconfig.json'],
      schema: tsconfigSchema
    }
  ]
});

loader.config({ monaco });
