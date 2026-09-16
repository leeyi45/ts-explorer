import ts from 'typescript';

interface CustomDiagnostic {
  message: string;
  start: number;
  length: number;
  category: any;
  code: number;
}

interface BaseWorkerMessage<T extends string> {
  type: T;
}

export interface SetFilesMessage extends BaseWorkerMessage<'setFiles'> {
  files: Record<string, FileEntry>;
}

export interface UpdateFileMessage extends BaseWorkerMessage<'updateFile'> {
  fileName: string;
  content: string;
}

export interface CompletionsRequestMessage extends BaseWorkerMessage<'completions'> {
  fileName: string;
  position: number;
  requestId: number;
}

export interface DiagnosticsRequestMessage extends BaseWorkerMessage<'diagnostics'> {
  fileName: string;
}

export interface QuickInfoRequestMessage extends BaseWorkerMessage<'quickInfo'> {
  fileName: string;
  position: number;
  requestId: number;
}

export interface ProjectInfoRequestMessage extends BaseWorkerMessage<'info'> {
}

export interface UpdateOptionsMessage extends BaseWorkerMessage<'updateOptions'> {
  rawOptions: string;
}

export interface CompletionsReplyMessage extends BaseWorkerMessage<'completions'> {
  requestId: number;
  items: ts.CompletionEntry[];
}

export interface DiagnosticsReplyMessage extends BaseWorkerMessage<'diagnostics'> {
  fileName: string;
  syntactic: CustomDiagnostic[];
  semantic: CustomDiagnostic[];
}

export interface QuickInfoReplyMessage extends BaseWorkerMessage<'quickInfo'> {
  requestId: number;
  result: { text: string; documentation: string; } | undefined;
}

export interface UpdateOptionReplyMessage extends BaseWorkerMessage<'updateOptions'> {
  errors?: CustomDiagnostic[];
}

export interface ProjectInfoReplyMessage extends BaseWorkerMessage<'info'> {
  result: any;
}

export type ReplyFromWorker =
  | CompletionsReplyMessage
  | DiagnosticsReplyMessage
  | QuickInfoReplyMessage
  | UpdateOptionReplyMessage
  | ProjectInfoReplyMessage;

type MessageToWorker =
  | CompletionsRequestMessage
  | DiagnosticsRequestMessage
  | ProjectInfoRequestMessage
  | QuickInfoRequestMessage
  | SetFilesMessage
  | UpdateFileMessage
  | UpdateOptionsMessage;

interface FileEntry {
  fileName: string;
  content: string;
  version: number;
}

let files: Record<string, FileEntry> = {
  '/main.ts': {
    fileName: '/main.ts',
    content: '',
    version: 0
  }
};

class LanguageHost implements ts.LanguageServiceHost {
  constructor(
    public compilationSettings: ts.CompilerOptions = {},
  ) {}

  fileExists(path: string): boolean {
    return path in files;
  }

  getCompilationSettings(): ts.CompilerOptions {
    return this.compilationSettings;
  }

  getCurrentDirectory(): string {
    return '/';
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return ts.getDefaultLibFileName(options);
  }

  getScriptFileNames(): string[] {
    return Object.keys(files);
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    if (fileName in files) {
      return ts.ScriptSnapshot.fromString(files[fileName].content);
    }

    return undefined;
  }

  getScriptVersion(fileName: string): string {
    return `${files[fileName]?.version ?? 0}`;
  }

  readFile(fileName: string) {
    return files[fileName]?.content;
  }
}

const compilerHost: ts.ParseConfigHost = {
  getCurrentDirectory: () => '/',
  useCaseSensitiveFileNames: true,
  readDirectory: () => Object.keys(files),
  readFile: fileName => files[fileName]?.content,
  fileExists: fileName => fileName in files,
};

function writeFile(fileName: string, content: string) {
  const prev = files[fileName];
  files[fileName] = {
    fileName,
    content,
    version: (prev?.version ?? -1) + 1
  };
}

let languageService: ts.LanguageService = getLanguageService({});

function getLanguageService(options: ts.CompilerOptions) {
  const host = new LanguageHost(options);
  return ts.createLanguageService(host);
}

function toDiagnostic(diagnostic: ts.Diagnostic) {
  return {
    message: ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    ),
    start: diagnostic.start ?? 0,
    length: diagnostic.length ?? 0,
    category: diagnostic.category,
    code: diagnostic.code,
  };
}

export function getInfo() {
  const program = languageService.getProgram();
  if (!program) return undefined;

  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile('/main.ts');
  if (!sourceFile) return undefined;

  const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!sourceFileSymbol) return undefined;

  return {
    escapedName: sourceFileSymbol.escapedName,
    flags: sourceFileSymbol.flags,
  };
}

export function handler(event: MessageEvent<MessageToWorker>) {
  const message = event.data;

  switch (message.type) {
    case 'setFiles': {
      files = message.files;
      break;
    }
    case 'updateFile': {
      const { fileName, content } = message;
      writeFile(fileName, content);
      break;
    }
    case 'diagnostics': {
      const { fileName } = message;
      const syntactic = languageService.getSyntacticDiagnostics(fileName).map(toDiagnostic);
      const semantic = languageService.getSemanticDiagnostics(fileName).map(toDiagnostic);
      const reply: DiagnosticsReplyMessage = {
        type: 'diagnostics',
        fileName,
        syntactic,
        semantic
      };

      self.postMessage(reply);
      break;
    }
    case 'completions': {
      const result = languageService.getCompletionsAtPosition(message.fileName, message.position, {});
      const reply: CompletionsReplyMessage = {
        type: 'completions',
        requestId: message.requestId,
        items: result?.entries ?? []
      };

      self.postMessage(reply);
      break;
    }
    case 'quickInfo': {
      const result = languageService.getQuickInfoAtPosition(message.fileName, message.position);
      const reply: QuickInfoReplyMessage = {
        type: 'quickInfo',
        requestId: message.requestId,
        result: result
          ? {
            text: ts.displayPartsToString(result.displayParts),
            documentation: ts.displayPartsToString(
              result.documentation
            ),
          }
          : undefined,
      };

      self.postMessage(reply);
      break;
    }
    case 'updateOptions': {
      const { rawOptions } = message;
      const { error, config } = ts.parseConfigFileTextToJson('/tsconfig.json', rawOptions);

      if (error) {
        const reply: UpdateOptionReplyMessage = {
          type: 'updateOptions',
          errors: [toDiagnostic(error)]
        };
        self.postMessage(reply);
        return;
      }

      const { errors, options } = ts.parseJsonConfigFileContent({
        include: ['/main.ts'],
        compilerOptions: config
      }, compilerHost, '/');

      const reply: UpdateOptionReplyMessage = {
        type: 'updateOptions',
        errors: errors.map(toDiagnostic)
      };
      self.postMessage(reply);

      if (errors.length > 0) return;

      const completeOptions: ts.CompilerOptions = {
        ...options,
        declaration: false,
        noEmit: true,
      };

      languageService = getLanguageService(completeOptions);
      break;
    }
    case 'info': {
      const reply: ProjectInfoReplyMessage = {
        type: 'info',
        result: getInfo(),
      };
      self.postMessage(reply);
      break;
    }
  }
}

self.onmessage = handler;
