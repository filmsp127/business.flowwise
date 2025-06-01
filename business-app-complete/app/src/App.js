import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import ModernExpenseTracker from "./ModernExpenseTracker";
import Login from "./Login";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import PinModal from "./PinModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState('verify');
  const [changingPin, setChangingPin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      const handlePinSuccess = () => {
        if (changingPin && pinMode === 'verify') {
          // ถ้ากำลังเปลี่ยน PIN และ verify สำเร็จ
          setPinMode('set');
          // Toast แจ้งให้ตั้ง PIN ใหม่
          const toast = document.createElement('div');
          toast.className = 'fixed top-20 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
          toast.innerHTML = '✅ PIN ถูกต้อง! ตั้ง PIN ใหม่ของคุณ';
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.style.transform = 'translateX(0)';
          }, 100);
          
          setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => document.body.removeChild(toast), 300);
          }, 2000);
        } else {
          setShowPinModal(false);
          
          if (pinMode === 'set') {
            // Toast notification สำหรับตั้ง PIN สำเร็จ
            const toast = document.createElement('div');
            toast.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
            toast.innerHTML = changingPin ? '🔐 เปลี่ยน PIN เรียบร้อย!' : '🔐 ตั้งรหัส PIN เรียบร้อย!';
            document.body.appendChild(toast);
            
            setTimeout(() => {
              toast.style.transform = 'translateX(0)';
            }, 100);
            
            setTimeout(() => {
              toast.style.transform = 'translateX(400px)';
              setTimeout(() => document.body.removeChild(toast), 300);
            }, 2000);
            
            // Reset flag
            setChangingPin(false);
          }
        }
      };
      // ดึง username
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid, "profile", "data"));
          if (profileDoc.exists()) {
            setUsername(profileDoc.data().username || user.email.split('@')[0]);
            
            // ✅ ใส่ตรงนี้! หลัง setUsername
            const savedUsername = profileDoc.data().username || user.email.split('@')[0];
            const savedPin = localStorage.getItem(`pin_${savedUsername}`);
            const pinVerified = sessionStorage.getItem('pinVerified');
  
            if (!savedPin) {
              // ยังไม่เคยตั้ง PIN
              setPinMode('set');
              setShowPinModal(true);
            } else if (!pinVerified) {
              // มี PIN แล้วแต่ยังไม่ verify
              setPinMode('verify');
              setShowPinModal(true);
            }
            
          } else {
            setUsername(user.email.split('@')[0]);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
          setUsername(user.email.split('@')[0]);
        }
      }
      
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);
  
  // handleLogout เหมือนเดิม ไม่ต้องแก้
  const handleLogout = async () => {
    // Create custom modal...
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-sm mx-4 transform transition-all">
        <div class="text-center">
          <div class="text-5xl mb-4">👋</div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">ออกจากระบบ?</h3>
          <p class="text-gray-600 mb-6">คุณแน่ใจหรือไม่ที่จะออกจากระบบ</p>
          <div class="flex gap-3">
            <button id="cancelBtn" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium">
              ยกเลิก
            </button>
            <button id="confirmBtn" class="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
      modal.querySelector('div').style.transform = 'scale(1.05)';
      setTimeout(() => {
        modal.querySelector('div').style.transform = 'scale(1)';
      }, 100);
    }, 10);
    
    // Handle buttons
    document.getElementById('cancelBtn').onclick = () => {
      modal.style.opacity = '0';
      setTimeout(() => document.body.removeChild(modal), 300);
    };
    
    document.getElementById('confirmBtn').onclick = async () => {
      try {
        await signOut(auth);
        modal.style.opacity = '0';
        setTimeout(() => document.body.removeChild(modal), 300);
      } catch (error) {
        console.error("Error signing out:", error);
      }
    };
  };
  const handlePinSuccess = () => {
    setShowPinModal(false);
    if (pinMode === 'set') {
      // Toast notification สำหรับตั้ง PIN สำเร็จ
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
      toast.innerHTML = '🔐 ตั้งรหัส PIN เรียบร้อย!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
      }, 100);
      
      setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    }
  };
  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }
  // 👇 เพิ่มโค้ดนี้ถ้าไม่มี
if (showPinModal) {
  return (
    <PinModal 
      onSuccess={handlePinSuccess}
      onClose={() => {
        setShowPinModal(false);
        setChangingPin(false);
      }}
      mode={pinMode}
      username={username}
    />
  );
}
  // Show main app if authenticated
  return (
    <div className="relative">
      <ModernExpenseTracker userId={user.uid} userEmail={user.email} username={username} />

      {/* Logout button */}
<div className="fixed top-4 right-4 flex items-center gap-3 bg-white bg-opacity-10 backdrop-blur-lg px-3 py-2 rounded-lg">
  <span className="text-white text-sm">
    👤 {username}
  </span>
  
  {/* เพิ่มปุ่ม Change PIN */}
  <button
    onClick={() => {
      // ตรวจสอบ PIN เดิมก่อน
      sessionStorage.removeItem('pinVerified');
      setPinMode('verify');
      setShowPinModal(true);
      setChangingPin(true);
    }}
    className="w-8 h-8 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-all hover:scale-110 flex items-center justify-center"
    title="เปลี่ยน PIN"
  >
    🔐
  </button>
  
  <button
    onClick={handleLogout}
    className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all hover:scale-110 flex items-center justify-center"
    title="ออกจากระบบ"
  >
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
    </button>
  </div>
        <button
          onClick={handleLogout}
          className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all hover:scale-110 flex items-center justify-center"
          title="ออกจากระบบ"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
  );
}
