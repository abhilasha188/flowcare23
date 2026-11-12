import { Activity, Heart, ShieldCheck } from 'lucide-react';

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <a className="brand" href="/" aria-label="FlowCare home">
            <span className="brand-mark"><Activity size={21} /></span>
            <span>flowcare</span>
          </a>
          <div className="aside-copy">
            <span className="eyebrow"><Heart size={14} /> WELLNESS, AT YOUR PACE</span>
            <h1>A little more in tune with yourself.</h1>
            <p>A private, thoughtful space to support your wellbeing—one day at a time.</p>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <span>Your account and personal information stay protected.</span>
          </div>
          <div className="aside-decoration" aria-hidden="true" />
        </aside>
        <section className="auth-content">
          <div className="auth-form-container">{children}</div>
          <p className="auth-footer">FlowCare · Your wellbeing, thoughtfully supported</p>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
