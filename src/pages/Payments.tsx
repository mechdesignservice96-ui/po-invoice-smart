import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Payments = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payments</CardTitle>
          <CardDescription>Track and record all payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Payment tracking coming soon</p>
            <p className="text-sm">Record payments and link them to invoices</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
