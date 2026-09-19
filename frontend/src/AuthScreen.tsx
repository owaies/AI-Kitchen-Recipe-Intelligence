import { FormEvent, useState } from "react";
import { ArrowRight, ChefHat, Eye, EyeOff, Leaf } from "lucide-react";
import { signIn, signUp } from "./services/auth";

type Props = { onAuthenticated: () => void };

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (mode === "signup" && name.trim().length < 2) {
      setMessage("Tell us your name first.");
      return;
    }
    if (password.length < 6) {
      setMessage("Use a password with at least 6 characters.");
      return;
    }
    try {
      setBusy(true);
      if (mode === "signup") {
        const result = await signUp(email.trim(), password, name.trim());
        if (!result.session) {
          setMessage("Account created. Check your email to confirm your account.");
          setMode("signin");
        } else {
          onAuthenticated();
        }
      } else {
        await signIn(email.trim(), password);
        onAuthenticated();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="auth-art-ring" />
        <div className="auth-plate"><ChefHat size={70} /></div>
        <span className="auth-note note-a">seasonal</span>
        <span className="auth-note note-b">fresh ideas</span>
      </div>
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark"><ChefHat size={18} /></div>
          <div><strong>Kitchen</strong><span>intelligence</span></div>
        </div>
        <span className="eyebrow"><Leaf size={13} /> Your private kitchen</span>
        <h1>{mode === "signin" ? "Welcome back." : "Make your kitchen smarter."}</h1>
        <p className="auth-copy">{mode === "signin" ? "Your pantry, recipes and plans are waiting." : "One account for your pantry, recipes, meals and shopping list."}</p>
        <form onSubmit={submit}>
          {mode === "signup" && <label>NAME<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>}
          <label>EMAIL<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>PASSWORD<div className="password-field"><input type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} required /><button type="button" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {message && <div className="auth-message">{message}</div>}
          <button className="primary auth-submit" disabled={busy}>{busy ? "Preparing your kitchen..." : mode === "signin" ? <>Enter kitchen <ArrowRight size={15} /></> : <>Create kitchen <ArrowRight size={15} /></>}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <small className="auth-foot">Your kitchen data is private and protected by database-level access rules.</small>
      </section>
    </main>
  );
}
