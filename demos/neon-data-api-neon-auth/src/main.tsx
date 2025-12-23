import ReactDOM from "react-dom/client";

import "./index.css";
import App from "./app";

// biome-ignore lint/style/noNonNullAssertion:
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
