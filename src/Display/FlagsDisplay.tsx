import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { uniqBy } from 'es-toolkit';
import ts from 'typescript';

interface FlagsDisplayProps {
  value: number;
  showFalse?: boolean;
}

export function createFlagsDisplay(flags: [string, number][], flagName: string) {
  flags = uniqBy(flags, ([name]) => name);

  const component = ({ value, showFalse }: FlagsDisplayProps) => {
    const flagValues = flags.map(([flag, flagValue]) => [flag, (flagValue & value) !== 0 ? 'True' : 'False'])
      .filter(([, value]) => showFalse || value === 'True');

    return <TreeItem itemId={`${flagName}_display`} label={`Flags (${flagName})`}>
      {flagValues.map(([flag, flagValue]) => (
        <TreeItem itemId={`flag_${flag}`} label={`${flag}: ${flagValue}`} />
      ))}
    </TreeItem>;
  };

  return component;
}

export const SymbolFlagsDisplay = createFlagsDisplay(
// @ts-ignore
  Object.keys(ts.SymbolFlags)
    .filter(each => Number.isNaN(Number(each)))
    .map(each => [each, ts.SymbolFlags[each as any]]),
  'SymbolFlags'
);
