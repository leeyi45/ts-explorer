import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { SymbolFlagsDisplay } from './FlagsDisplay';

interface SymbolDisplayProps {
  name: string;
  escapedName: string;
  flags: number;
}

export default function SymbolDisplay(props: SymbolDisplayProps) {
  return <SimpleTreeView>
    <TreeItem itemId='name' label={props.name}>
      <SymbolFlagsDisplay value={props.flags} />
      <TreeItem itemId='escapedName' label={`Escaped Name: ${props.escapedName}`} />
    </TreeItem>
  </SimpleTreeView>;
}
