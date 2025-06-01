import React, { useState, useEffect } from 'react';

export default function PinModal({ onSuccess, onClose, mode = 'verify', username = '' }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [shake, setShake] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePinChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      
      // Auto focus next input
      if (value && index < 5) {
        setTimeout(() => {
          document.getElementById(`pin-${index + 1}`)?.focus();
        }, 10);
      }
      
      // Check if complete
      if (index === 5 && value) {
        const fullPin = newPin.join('');
        if (fullPin.length === 6) {
          setTimeout(() => handleSubmit(fullPin), 100);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = (fullPin) => {
    if (mode === 'set') {
      localStorage.setItem(`pin_${username}`, fullPin);
      onSuccess();
    } else {
      const savedPin = localStorage.getItem(`pin_${username}`);
      if (savedPin === fullPin) {
        sessionStorage.setItem('pinVerified', 'true');
        onSuccess();
      } else {
        setError('PIN ไม่ถูกต้อง');
        setShake(true);
        setPin(['', '', '', '', '', '']);
        setTimeout(() => {
          document.getElementById('pin-0')?.focus();
          setError('');
          setShake(false);
        }, 2000);
      }
    }
  };

  const handleForgotPin = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    localStorage.removeItem(`pin_${username}`);
    sessionStorage.removeItem('pinVerified');
    window.location.reload();
  };

  useEffect(() => {
    document.getElementById('pin-0')?.focus();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      {/* Beautiful gradient background with blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900">
        <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"></div>
      </div>
      
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Modal Card */}
      <div className={`relative bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white border-opacity-20 transform transition-all duration-300 ${shake ? 'animate-shake' : 'animate-slideUp'}`}>
        <div className="text-center">
          {/* Animated Lock Icon */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center">
              <span className="text-4xl filter drop-shadow-lg">🔐</span>
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            {mode === 'set' ? 'ตั้งรหัส PIN' : `ยินดีต้อนรับ`}
          </h3>
          <p className="text-purple-200 mb-1 text-lg">
            {mode === 'set' ? 'สร้างรหัส PIN 6 หลักของคุณ' : username}
          </p>
          <p className="text-purple-300 mb-8 text-sm">
            {mode === 'set' ? 'เพื่อความปลอดภัยของข้อมูล' : 'กรุณากรอกรหัส PIN เพื่อเข้าใช้งาน'}
          </p>
          
          {/* PIN Input Boxes */}
          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <div key={index} className="relative">
                <input
                  id={`pin-${index}`}
                  type="password"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-14 h-14 text-center text-2xl font-bold bg-white bg-opacity-20 backdrop-blur border-2 rounded-2xl focus:outline-none transition-all ${
                    error 
                      ? 'border-red-400 text-red-300' 
                      : 'border-purple-400 border-opacity-50 focus:border-purple-300 focus:bg-opacity-30 text-white'
                  } shadow-lg`}
                  autoComplete="off"
                />
                {digit && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 animate-fadeIn">
              <p className="text-red-400 text-sm font-medium flex items-center justify-center gap-2">
                <span className="text-lg">⚠️</span>
                {error}
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {mode === 'set' && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white bg-opacity-10 text-white rounded-2xl hover:bg-opacity-20 transition-all font-medium backdrop-blur border border-white border-opacity-20"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleSubmit(pin.join(''))}
                  disabled={pin.some(p => !p)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:opacity-90 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ยืนยัน
                </button>
              </div>
            )}
            
            {mode === 'verify' && (
              <>
                <button
                  onClick={() => setShowForgot(!showForgot)}
                  className="text-purple-300 text-sm hover:text-white transition-colors font-medium"
                >
                  ลืมรหัส PIN? 🤔
                </button>
                
                {showForgot && (
                  <div className="animate-fadeIn bg-red-500 bg-opacity-10 border border-red-400 border-opacity-30 rounded-2xl p-4 backdrop-blur">
                    <p className="text-red-200 text-sm mb-3 font-medium">
                      ⚠️ การรีเซ็ต PIN จะออกจากระบบ
                    </p>
                    <button
                      onClick={handleForgotPin}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all text-sm font-medium shadow-lg"
                    >
                      รีเซ็ต PIN
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-purple-300 text-xs">
            <span>🔒</span>
            <span>ข้อมูลของคุณถูกเข้ารหัสอย่างปลอดภัย</span>
          </div>
        </div>
      </div>
      
      {/* Custom Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-60">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowResetConfirm(false)}></div>
          <div className="relative bg-gradient-to-br from-red-600 to-pink-600 p-1 rounded-3xl animate-slideUp">
            <div className="bg-gray-900 bg-opacity-95 backdrop-blur-xl rounded-3xl p-8 max-w-sm mx-4">
              <div className="text-center">
                {/* Warning Icon */}
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-red-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  ต้องการรีเซ็ต PIN?
                </h3>
                <p className="text-gray-300 mb-6">
                  ระบบจะออกจากระบบ<br/>และให้ตั้ง PIN ใหม่
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-2xl hover:bg-gray-600 transition-all font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmReset}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl hover:opacity-90 transition-all font-medium shadow-lg"
                  >
                    รีเซ็ต PIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}