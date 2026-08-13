import { BrowserRouter, Route, Routes } from "react-router-dom";
import CanvasScreen from "./screens/CanvasScreen";
import ProjectListScreen from "./screens/ProjectListScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectListScreen />} />
        <Route path="/projects/:projectId" element={<CanvasScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
