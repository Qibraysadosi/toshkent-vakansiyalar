import Logo from "./Logo.jsx";
import { SUGGESTED_QUESTIONS } from "../lib/api.js";
import "./WelcomeScreen.css";

export default function WelcomeScreen({ onPick }) {
  return (
    <div className="fi-welcome">
      <div className="fi-welcome-logo">
        <Logo size={56} />
      </div>
      <h1 className="fi-welcome-title">Fintellect bilan suhbatlashing</h1>
      <p className="fi-welcome-subtitle">
        Buxgalteriya, soliq va moliya bo'yicha savollaringizga aniq va tushunarli javoblar oling.
      </p>

      <div className="fi-suggestions">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q.title} className="fi-suggestion-card" onClick={() => onPick(q.text)}>
            <span className="fi-suggestion-title">{q.title}</span>
            <span className="fi-suggestion-text">{q.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
