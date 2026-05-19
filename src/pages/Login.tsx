import React, { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
  
  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }
    try {
      await resetPassword(email);
      alert("Password reset email sent!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-slate-950 font-sans text-slate-100">
      <div className="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold tracking-tighter text-2xl shadow-md">
            RX
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">IROBOTIX <span className="text-blue-600">OPS</span></h1>
          </div>
        </div>
        
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          {error && <div className="text-red-400 text-xs text-center">{error}</div>}
          <div className="space-y-3">
            <Input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100"
            />
            <Input 
              type="password" 
              placeholder="Password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full py-6 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">
            {loading ? "Authenticating..." : isRegistering ? "Register Account" : "Access System"}
          </Button>
          
          <div className="flex justify-between w-full text-xs text-slate-400 pt-2">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="hover:text-blue-400">
              {isRegistering ? "Back to Login" : "Create Account"}
            </button>
            <button type="button" onClick={handleReset} className="hover:text-blue-400">
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
