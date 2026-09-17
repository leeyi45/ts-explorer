import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

interface ModuleDisplayProps {
  name: string;
}

export default function ModuleDisplay(props: ModuleDisplayProps) {
  return <SimpleTreeView>
    <TreeItem itemId='huh' label="huh"/>
  </SimpleTreeView>;
}
