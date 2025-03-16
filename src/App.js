import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Case from './Case'
import PaginaPornire from './PaginaPornire'
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaginaPornire />} />
        <Route path="/med" element={<Case />} /> 
      </Routes>
    </Router>
  );
}

export default App;
