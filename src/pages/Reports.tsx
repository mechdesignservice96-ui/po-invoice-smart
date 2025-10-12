import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Reports = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reports & Analytics</CardTitle>
          <CardDescription>Generate detailed financial reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Advanced reporting coming soon</p>
            <p className="text-sm">Export reports to PDF and Excel</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
