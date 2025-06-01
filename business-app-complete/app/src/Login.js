import React, { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db } from "./firebase";
import { doc, setDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loginInput, setLoginInput] = useState(""); // สำหรับ login (username/email)
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      if (isSignUp) {
        // Sign up
        if (password !== confirmPassword) {
          throw new Error("รหัสผ่านไม่ตรงกัน");
        }
        if (password.length < 6) {
          throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        }
        if (!username || username.length < 3) {
          throw new Error("username ต้องมีอย่างน้อย 3 ตัวอักษร");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error("username ใช้ได้เฉพาะ a-z, 0-9 และ _ เท่านั้น");
        }
        
        // Check if username exists
        const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
        if (usernameDoc.exists()) {
          throw new Error("username นี้ถูกใช้แล้ว");
        }
        
        // Create account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Save username mapping
        await setDoc(doc(db, "usernames", username.toLowerCase()), {
          email: email,
          uid: userCredential.user.uid,
          createdAt: new Date()
        });
        
        // Save user data
        await setDoc(doc(db, "users", userCredential.user.uid, "profile", "data"), {
          username: username,
          email: email,
          createdAt: new Date()
        });
        
        // Toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-gray-800 px-8 py-6 rounded-2xl shadow-2xl z-50 text-center min-w-[300px]';
        toast.innerHTML = `
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-2xl font-bold mb-2">ยินดีต้อนรับ!</h3>
          <p class="text-gray-600">สมัครสมาชิกสำเร็จ</p>
          <p class="text-sm text-gray-500 mt-2">Username: ${username}</p>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.5s';
          setTimeout(() => document.body.removeChild(toast), 500);
        }, 2000);
        
      } else {
        // Sign in - รองรับทั้ง username และ email
        let loginEmail = email;
        
        // ถ้าไม่มี @ แสดงว่าเป็น username
        if (!email.includes('@')) {
          const usernameDoc = await getDoc(doc(db, "usernames", email.toLowerCase()));
          if (usernameDoc.exists()) {
            loginEmail = usernameDoc.data().email;
          } else {
            throw new Error("ไม่พบ username นี้");
          }
        }
        
        await signInWithEmailAndPassword(auth, loginEmail, password);
        
        // Login success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-gray-800 px-8 py-6 rounded-2xl shadow-2xl z-50 text-center min-w-[300px]';
        toast.innerHTML = `
          <div class="text-6xl mb-4">✨</div>
          <h3 class="text-2xl font-bold mb-2">ยินดีต้อนรับกลับ!</h3>
          <p class="text-gray-600">เข้าสู่ระบบสำเร็จ</p>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.5s';
          setTimeout(() => document.body.removeChild(toast), 500);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      let errorMessage = error.message;
      if (error.code === "auth/user-not-found") {
        errorMessage = "ไม่พบผู้ใช้นี้";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "รหัสผ่านไม่ถูกต้อง";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "รหัสผ่านไม่ปลอดภัยพอ";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("กรุณากรอกอีเมลก่อน");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการส่งอีเมล");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            ระบบบัญชีธุรกิจ
          </h1>
          <p className="text-purple-200">จัดการรายรับรายจ่ายของคุณ</p>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6">
          {isSignUp ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </h2>

        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    {isSignUp ? "อีเมล" : "Username หรือ อีเมล"}
  </label>
  <input
    type={isSignUp ? "email" : "text"}
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
    placeholder={isSignUp ? "your@email.com" : "username หรือ email"}
    required
  />
</div>
          {isSignUp && (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Username
    </label>
    <input
      type="text"
      value={username}
      onChange={(e) => setUsername(e.target.value.toLowerCase())}
      className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
      placeholder="username (a-z, 0-9, _)"
      required
      pattern="[a-zA-Z0-9_]+"
      minLength="3"
    />
  </div>
)}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      ยืนยันรหัสผ่าน
    </label>
    <input
      type="password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
      placeholder="••••••••"
      required
    />
  </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : isSignUp
              ? "สมัครสมาชิก"
              : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {!isSignUp && (
            <button
              onClick={handleForgotPassword}
              className="text-purple-400 hover:text-purple-300 text-sm mb-4 block"
            >
              ลืมรหัสผ่าน?
            </button>
          )}

          <p className="text-gray-300">
            {isSignUp ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-purple-400 ml-2 hover:underline"
            >
              {isSignUp ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-sm text-center">
            💡 เมื่อเข้าสู่ระบบแล้ว ครั้งต่อไปจะไม่ต้อง login ใหม่
            <br />
            ข้อมูลของแต่ละคนจะแยกกันอย่างปลอดภัย
          </p>
        </div>
      </div>
    </div>
  );
}
