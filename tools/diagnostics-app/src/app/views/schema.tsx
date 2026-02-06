import { NavigationPage } from '@/components/navigation/NavigationPage';
import { schemaManager } from '@/library/powersync/ConnectionManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SchemaPage() {
  const schema = schemaManager.schemaToString();

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
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">{schema}</pre>
          </CardContent>
        </Card>
      </div>
    </NavigationPage>
  );
}
