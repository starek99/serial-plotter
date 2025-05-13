import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Card className="m-4">
                    <CardHeader>
                        <CardTitle>Something went wrong</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{this.state.error?.message}</p>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            Reload Application
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;