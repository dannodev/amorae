import React, { useState } from "react";
import { auth } from "../config/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const LoginModal = () => {
  const { showUserLogin, setShowUserLogin, setUser } = useAppContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showUserLogin) return null;

  const handleClose = () => {
    setShowUserLogin(false);
    // Reset fields
    setEmail("");
    setPassword("");
    setName("");
    setIsSignUp(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error("Por favor ingresa tu nombre");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        setUser(userCredential.user);
        toast.success(`¡Bienvenido/a, ${name}!`);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
        toast.success(`¡Qué bueno verte de nuevo, ${userCredential.user.displayName || "pastelero"}!`);
      }
      handleClose();
    } catch (error) {
      console.error(error);
      let errorMsg = "Ocurrió un error. Intenta de nuevo.";
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "Este correo ya está registrado.";
      } else if (error.code === "auth/invalid-credential") {
        errorMsg = "Correo o contraseña incorrectos.";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "La contraseña debe tener al menos 6 caracteres.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "El correo no es válido.";
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      toast.success(`¡Sesión iniciada con Google! Bienvenido/a, ${result.user.displayName}`);
      handleClose();
    } catch (error) {
      console.error(error);
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Error al iniciar sesión con Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md p-8 mx-4 bg-white/90 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-xl font-semibold"
        >
          &times;
        </button>

        <h2 className="text-3xl font-semibold text-center text-primary-dull mb-6">
          {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
        </h2>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 text-white bg-primary hover:bg-primary-dull rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Cargando..." : isSignUp ? "Registrarse" : "Ingresar"}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">O continuar con</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="flex items-center justify-center w-full py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm text-gray-700 font-medium cursor-pointer disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.473 0-6.291-2.818-6.291-6.29s2.818-6.29 6.291-6.29c1.635 0 3.117.626 4.24 1.645l3.123-3.124C19.26 2.54 15.908 1.1 12.24 1.1 6.136 1.1 1.1 6.136 1.1 12.24s5.036 11.14 11.14 11.14c6.302 0 11.02-4.428 11.02-11.02 0-.693-.06-1.365-.173-2.075H12.24z"
            />
          </svg>
          Google
        </button>

        <p className="mt-6 text-sm text-center text-gray-600">
          {isSignUp ? "¿Ya tienes una cuenta?" : "¿No tienes cuenta aún?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:text-primary-dull font-semibold transition-colors focus:outline-none cursor-pointer"
          >
            {isSignUp ? "Inicia Sesión" : "Regístrate aquí"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
