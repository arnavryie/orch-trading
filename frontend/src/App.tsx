import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalysisDashboard from './components/AnalysisDashboard';

export default function App() {
  return (
    <div className="flex h-screen bg-bg-app text-text-primary font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-app relative">
        <Header />
        <main className="flex-1 overflow-y-auto relative">
          <AnalysisDashboard />
        </main>
      </div>
    </div>
  );
}
