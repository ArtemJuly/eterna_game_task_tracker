import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Rewards from './pages/Rewards';
import History from './pages/History';
import Settings from './pages/Settings';
import Tracks from './pages/Tracks';
import TrackDetail from './pages/TrackDetail';
import GoalMap from './pages/GoalMap';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/tracks/:id" element={<TrackDetail />} />
          <Route path="/goal-map" element={<GoalMap />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
