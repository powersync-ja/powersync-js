import { NavigationPage } from '@/components/navigation/NavigationPage';
import { schemaManager } from '@/library/powersync/ConnectionManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Editor from '@monaco-editor/react';
import { POWERSYNC_MONACO_THEME } from '@/components/providers/MonacoThemeProvider';

export default function SchemaPage() {
  const schema = schemaManager.schemaToString();
  const lineCount = schema.split('\n').length;

  return (
    <NavigationPage title="Dynamic Schema">
      <div className="min-w-0 max-w-full overflow-x-hidden p-5">
        <Card>
          <CardHeader>
            <CardTitle>Inferred Schema</CardTitle>
            <CardDescription>
              This schema is generated on-the-fly based on the data received by the app. It can be incomplete and should
              NOT be relied upon as a source of truth for your app schema. Tables and columns are only added here -
              nothing is removed until the database is cleared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border">
              <Editor
                height={`${Math.min(Math.max(lineCount * 20, 200), 600)}px`}
                language="typescript"
                theme={POWERSYNC_MONACO_THEME}
                value={schema}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 0,
                  overviewRulerLanes: 0,
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  padding: { top: 12, bottom: 12 },
                  fontSize: 13,
                  tabSize: 2,
                  automaticLayout: true
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </NavigationPage>
  );
}
