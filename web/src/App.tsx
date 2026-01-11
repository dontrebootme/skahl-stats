import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Games from './pages/Games';
import TeamDetail from './pages/TeamDetail';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/games" element={<Games />} />
          <Route path="/teams/:teamId" element={<TeamDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
