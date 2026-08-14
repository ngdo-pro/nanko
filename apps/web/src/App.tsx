import { BrowserRouter, Route, Routes } from "react-router-dom";
import CanvasScreen from "./screens/CanvasScreen";
import CompareScreen from "./screens/CompareScreen";
import ProjectListScreen from "./screens/ProjectListScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectListScreen />} />
        <Route path="/projects/:projectId" element={<CanvasScreen />} />
        <Route path="/projects/:projectId/systems/:systemId" element={<CanvasScreen />} />
        <Route path="/projects/:projectId/systems/:systemId/containers/:containerId" element={<CanvasScreen />} />
        <Route path="/projects/:projectId/compare" element={<CompareScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
