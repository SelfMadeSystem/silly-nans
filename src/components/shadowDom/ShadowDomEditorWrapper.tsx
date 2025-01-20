import { MonacoProvider } from './MonacoEditor';
import ShadowDomEditor from './ShadowDomEditor';

export default function ShadowDomEditorWrapper() {
  return (
    <MonacoProvider>
      <ShadowDomEditor />
    </MonacoProvider>
  )
}