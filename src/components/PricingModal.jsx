import { useEffect } from "react";
import "./PricingModal.css";

const PLANS = [
  {
    id: "daily",
    name: "Kunlik",
    price: "5 000",
    period: "kun",
    description: "Bir martalik yoki tez-tez bo'lmagan savollar uchun.",
    features: ["Cheklovsiz savollar (1 kun)", "Barcha buxgalteriya mavzulari", "Suhbat tarixi"],
  },
  {
    id: "monthly",
    name: "Oylik",
    price: "79 000",
    period: "oy",
    description: "Doimiy ishlatuvchilar uchun eng qulay tanlov.",
    features: [
      "Cheklovsiz savollar (30 kun)",
      "Barcha buxgalteriya mavzulari",
      "Tezkor javoblar",
      "Ustuvor qo'llab-quvvatlash",
    ],
    popular: true,
  },
  {
    id: "yearly",
    name: "Yillik",
    price: "790 000",
    period: "yil",
    description: "Uzoq muddatli foydalanish uchun eng tejamkor.",
    features: [
      "Cheklovsiz savollar (365 kun)",
      "Barcha buxgalteriya mavzulari",
      "Tezkor javoblar",
      "Ustuvor qo'llab-quvvatlash",
      "2 oylik chegirma",
    ],
  },
];

export default function PricingModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fi-modal-backdrop" onClick={onClose}>
      <div className="fi-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fi-modal-close" onClick={onClose} aria-label="Yopish">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="fi-modal-header">
          <h2>Tariflarni tanlang</h2>
          <p>Fintellect'dan cheklovsiz foydalanish uchun sizga mos tarifni tanlang.</p>
        </div>

        <div className="fi-plans">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`fi-plan-card ${plan.popular ? "is-popular" : ""}`}>
              {plan.popular && <span className="fi-plan-badge">Mashhur</span>}
              <div className="fi-plan-name">{plan.name}</div>
              <div className="fi-plan-price">
                <span className="tabular">{plan.price}</span>
                <span className="fi-plan-currency">so'm</span>
                <span className="fi-plan-period">/{plan.period}</span>
              </div>
              <p className="fi-plan-desc">{plan.description}</p>
              <ul className="fi-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8.5 6.2 11.5 13 4"
                        stroke="var(--success)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`fi-plan-btn ${plan.popular ? "is-primary" : ""}`}>Tanlash</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
