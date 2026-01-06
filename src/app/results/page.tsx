import { Suspense } from 'react';
import ResultsContent from './results-content';

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
