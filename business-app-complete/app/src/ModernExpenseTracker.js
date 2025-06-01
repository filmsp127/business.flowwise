import React, { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import PinModal from "./PinModal";

export default function ModernExpenseTracker({ userId, userEmail }) {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [transactionType, setTransactionType] = useState("expense");
  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    // โหลด dark mode preference จาก localStorage
    const saved = localStorage.getItem(`darkMode_${userId}`);
    return saved ? JSON.parse(saved) : false;
  });
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletedItem, setDeletedItem] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Form states
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ต้นทุนสินค้า");
  const [incomeCategory, setIncomeCategory] = useState("ขายสินค้า");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const IDLE_TIME = 5 * 60 * 1000; // 5 นาที

    const updateActivity = () => {
      setLastActivity(Date.now());
      setIsLocked(false);
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keypress", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > IDLE_TIME && !isLocked) {
        setIsLocked(true);
        sessionStorage.removeItem("pinVerified");
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keypress", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      clearInterval(interval);
    };
  }, [lastActivity, isLocked]);

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    const IDLE_TIME = 5 * 60 * 1000; // 5 นาที

    // ฟังก์ชันอัพเดทเวลาล่าสุด
    const updateActivity = () => {
      setLastActivity(Date.now());
      setIsLocked(false);
    };

    // ตรวจจับการใช้งาน
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keypress", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    // เช็คทุกๆ 10 วินาที
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > IDLE_TIME && !isLocked) {
        setIsLocked(true);
        sessionStorage.removeItem("pinVerified");
      }
    }, 10000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keypress", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      clearInterval(interval);
    };
  }, [lastActivity, isLocked]);

  // Categories with colors - ปรับให้เหมาะกับธุรกิจ
  const expenseCategories = {
    ต้นทุนสินค้า: "#FF6B6B",
    ค่าขนส่ง: "#4ECDC4",
    "ค่าเช่าร้าน/ที่": "#45B7D1",
    ค่าสาธารณูปโภค: "#96CEB4",
    ค่าแรงพนักงาน: "#FECA57",
    "ค่าการตลาด/โฆษณา": "#FF9FF3",
    ค่าวัสดุอุปกรณ์: "#A55EC4",
    ค่าบำรุงรักษา: "#FDA7DF",
    ภาษี: "#D980FA",
    อื่นๆ: "#95AFFE",
  };

  const incomeCategories = {
    ขายสินค้า: "#10B981",
    ขายบริการ: "#34D399",
    รายได้อื่นๆ: "#6EE7B7",
  };

  // Load data from Firestore
  useEffect(() => {
    if (!userId) return;

    setLoadingData(true);

    // Load transactions from Firestore with real-time updates
    const transactionsRef = collection(db, `users/${userId}/transactions`);
    const q = query(transactionsRef, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactionsData = [];
        snapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(transactionsData);
        setLoadingData(false);
      },
      (error) => {
        console.error("Error loading transactions:", error);
        setLoadingData(false);
      }
    );

    // Load settings (monthly goal)
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(
          doc(db, `users/${userId}/settings`, "config")
        );
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          if (data.monthlyGoal) setMonthlyGoal(data.monthlyGoal);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
    // Load favorites
    const loadFavorites = async () => {
      try {
        const favoritesDoc = await getDoc(
          doc(db, `users/${userId}/settings`, "favorites")
        );
        if (favoritesDoc.exists()) {
          const data = favoritesDoc.data();
          if (data.items) setFavorites(data.items);
        }
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };
    loadFavorites();

    // Migrate old data from localStorage (one time)
    const migrateLocalData = async () => {
      // ❌ ปิดการ migrate ชั่วคราว เพื่อป้องกันข้อมูลปนกัน
      /*
      const localData = localStorage.getItem("modernTransactions");
      const migrated = localStorage.getItem(`migrated_${userId}`);
      
      if (localData && !migrated) {
        try {
          const oldTransactions = JSON.parse(localData);
          for (const transaction of oldTransactions) {
            await setDoc(doc(transactionsRef, transaction.id.toString()), {
              ...transaction,
              createdAt: new Date()
            });
          }
          localStorage.setItem(`migrated_${userId}`, "true");
          alert("ข้อมูลเก่าถูกย้ายไปยัง Cloud เรียบร้อยแล้ว!");
        } catch (error) {
          console.error("Error migrating data:", error);
        }
      }
      */

      // ✅ แค่ clear ข้อมูลเก่าทิ้ง
      localStorage.removeItem("modernTransactions");
    };

    return () => unsubscribe();
  }, [userId]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem(`darkMode_${userId}`, JSON.stringify(darkMode));
  }, [darkMode, userId]);

  // Save monthly goal to Firestore
  const saveMonthlyGoal = async (goal) => {
    if (!userId) return;
    try {
      await setDoc(
        doc(db, `users/${userId}/settings`, "config"),
        {
          monthlyGoal: goal,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (transaction) => {
    const favItem = {
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
    };

    let newFavorites;
    const exists = favorites.some(
      (f) =>
        f.description === favItem.description && f.category === favItem.category
    );

    if (exists) {
      newFavorites = favorites.filter(
        (f) =>
          !(
            f.description === favItem.description &&
            f.category === favItem.category
          )
      );
    } else {
      newFavorites = [...favorites, favItem];
    }

    setFavorites(newFavorites);

    // Save to Firestore
    try {
      await setDoc(
        doc(db, `users/${userId}/settings`, "favorites"),
        {
          items: newFavorites,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Toast notification
      const toast = document.createElement("div");
      toast.className = `fixed top-20 right-4 ${
        exists ? "bg-gray-500" : "bg-yellow-500"
      } text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50`;
      toast.innerHTML = exists
        ? "⭐ ลบออกจากรายการโปรด"
        : "⭐ เพิ่มในรายการโปรด";
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.transform = "translateX(0)";
      }, 100);

      setTimeout(() => {
        toast.style.transform = "translateX(400px)";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    } catch (error) {
      console.error("Error saving favorite:", error);
    }
  };

  // Add from favorite
  const addFromFavorite = (fav) => {
    setTransactionType(fav.type);
    setDescription(fav.description);
    setAmount(fav.amount.toString());
    if (fav.type === "expense") {
      setCategory(fav.category);
    } else {
      setIncomeCategory(fav.category);
    }
    setShowAddModal(true);
    setShowFavorites(false);
  };
  // Confirmation modal for export
  const showExportConfirm = (type) => {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
      modal.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-sm mx-4 transform transition-all">
        <div class="text-center">
          <div class="text-5xl mb-4">${type === "excel" ? "📊" : "📄"}</div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">ดาวน์โหลด ${
            type === "excel" ? "Excel" : "PDF"
          }?</h3>
          <p class="text-gray-600 mb-6">ยืนยันการดาวน์โหลดรายงาน${
            type === "excel" ? "ไฟล์ Excel" : "ไฟล์ PDF"
          }</p>
          <div class="flex gap-3">
            <button id="cancelExport" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium">
              ยกเลิก
            </button>
            <button id="confirmExport" class="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium">
              ดาวน์โหลด
            </button>
          </div>
        </div>
      </div>
    `;

      document.body.appendChild(modal);

      // Animation
      setTimeout(() => {
        modal.querySelector("div").style.transform = "scale(1.05)";
        setTimeout(() => {
          modal.querySelector("div").style.transform = "scale(1)";
        }, 100);
      }, 10);

      // Handle buttons
      document.getElementById("cancelExport").onclick = () => {
        modal.style.opacity = "0";
        setTimeout(() => document.body.removeChild(modal), 300);
        resolve(false);
      };

      document.getElementById("confirmExport").onclick = () => {
        modal.style.opacity = "0";
        setTimeout(() => document.body.removeChild(modal), 300);
        resolve(true);
      };
    });
  };

  // Export to Excel
  const exportToExcel = async () => {
    // เพิ่ม async
    const confirmed = await showExportConfirm("excel"); // เพิ่มบรรทัดนี้
    if (!confirmed) return; // เพิ่มบรรทัดนี้

    const monthData = getMonthData();
    let csvContent = "\uFEFF";
    csvContent += "วันที่\tประเภท\tรายการ\tหมวดหมู่\tจำนวนเงิน\n";

    monthData.forEach((t) => {
      const date = new Date(t.date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const type = t.type === "income" ? "รายรับ" : "รายจ่าย";
      const amount = t.type === "income" ? t.amount : -t.amount;

      csvContent += `${date}\t${type}\t${t.description}\t${t.category}\t${amount}\n`;
    });

    // Summary
    const summary = getMonthSummary();
    csvContent += "\n";
    csvContent += `\t\tรวมรายรับ\t\t${summary.income}\n`;
    csvContent += `\t\tรวมรายจ่าย\t\t${summary.expense}\n`;
    csvContent += `\t\tกำไรสุทธิ\t\t${summary.balance}\n`;

    // Download as .tsv
    const blob = new Blob([csvContent], {
      type: "text/tab-separated-values;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `business-report-${selectedMonth.toISOString().slice(0, 7)}.xls`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (using browser print)
  const exportToPDF = async () => {
    // เพิ่ม async
    const confirmed = await showExportConfirm("pdf"); // เพิ่มบรรทัดนี้
    if (!confirmed) return; // เพิ่มบรรทัดนี้
    // สร้าง HTML สำหรับ print
    const monthData = getMonthData();
    const summary = getMonthSummary();

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>รายงาน ${selectedMonth.toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          })}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; font-weight: bold; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>รายงานประจำเดือน ${selectedMonth.toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          })}</h1>
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ประเภท</th>
                <th>รายการ</th>
                <th>หมวดหมู่</th>
                <th>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              ${monthData
                .map(
                  (t) => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString("th-TH")}</td>
                  <td>${t.type === "income" ? "รายรับ" : "รายจ่าย"}</td>
                  <td>${t.description}</td>
                  <td>${t.category}</td>
                  <td style="text-align: right;">${
                    t.type === "income" ? "" : "-"
                  }฿${t.amount.toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <p>รวมรายรับ: ฿${summary.income.toLocaleString()}</p>
            <p>รวมรายจ่าย: ฿${summary.expense.toLocaleString()}</p>
            <p>กำไรสุทธิ: ฿${summary.balance.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Get month data
  const getMonthData = () => {
    const monthStart = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    );

    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
    });
  };
  // Filter transactions based on search and filters
  const getFilteredTransactions = (transactionsList) => {
    let filtered = transactionsList;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Period filter
    if (filterPeriod !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filterPeriod) {
        case "today":
          filtered = filtered.filter((t) => {
            const tDate = new Date(t.date);
            tDate.setHours(0, 0, 0, 0);
            return tDate.getTime() === today.getTime();
          });
          break;
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter((t) => new Date(t.date) >= weekAgo);
          break;
        case "month":
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filtered = filtered.filter((t) => new Date(t.date) >= monthAgo);
          break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.date) - new Date(a.date);
        case "oldest":
          return new Date(a.date) - new Date(b.date);
        case "highest":
          return b.amount - a.amount;
        case "lowest":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return filtered;
  };
  // Calculate monthly summary
  const getMonthSummary = () => {
    const monthData = getMonthData();
    const income = monthData
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthData
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
  };

  // Get daily breakdown for the month
  const getDailyBreakdown = (useFilter = false) => {
    const monthData = getMonthData();
    const dataToProcess = useFilter
      ? getFilteredTransactions(monthData)
      : monthData;
    const dailyData = {};

    dataToProcess.forEach((t) => {
      const dateKey = new Date(t.date).toLocaleDateString("th-TH");
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }
      if (t.type === "income") {
        dailyData[dateKey].income += t.amount;
      } else {
        dailyData[dateKey].expense += t.amount;
      }
    });

    return Object.values(dailyData).sort((a, b) => {
      const dateA = a.date.split("/").reverse().join("-");
      const dateB = b.date.split("/").reverse().join("-");
      return dateB.localeCompare(dateA);
    });
  };

  // Get category breakdown
  const getCategoryBreakdown = () => {
    const monthData = getMonthData();
    const categoryData = {};

    monthData
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
      });

    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value,
      color: expenseCategories[name] || "#95AFFE",
    }));
  };

  // Get last 6 months trend
  const getMonthlyTrend = () => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      trend.push({
        month: date.toLocaleDateString("th-TH", {
          month: "short",
          year: "2-digit",
        }),
        income,
        expense,
        profit: income - expense,
      });
    }
    return trend;
  };

  // Add transaction to Firestore
  const addTransaction = async () => {
    console.log("Add transaction called, isSaving:", isSaving);
    if (isSaving) return;

    // Reset previous errors
    setValidationErrors({});

    // Validate fields
    const errors = {};

    if (!description.trim()) {
      errors.description = "กรุณากรอกรายการ";
    }

    if (!amount || parseFloat(amount) <= 0) {
      errors.amount = "กรุณากรอกจำนวนเงินที่ถูกต้อง";
    }

    if (!date) {
      errors.date = "กรุณาเลือกวันที่";
    }

    // ถ้ามี error ให้แสดงและหยุดทำงาน
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);

      // Shake animation
      const modal = document.querySelector(".bg-gray-900.rounded-2xl");
      if (modal) {
        modal.style.animation = "shake 0.5s ease-in-out";
        setTimeout(() => {
          modal.style.animation = "";
        }, 500);
      }

      return;
    }

    setIsSaving(true); // เริ่ม loading

    const newTransaction = {
      type: transactionType,
      description,
      amount: parseFloat(amount),
      category: transactionType === "expense" ? category : incomeCategory,
      date: date,
      createdAt: new Date(),
      userId: userId,
    };

    try {
      if (editingTransaction) {
        // Update existing transaction in Firestore
        await updateDoc(
          doc(db, `users/${userId}/transactions`, editingTransaction.id),
          newTransaction
        );
        setEditingTransaction(null);
        setShowEditModal(false);
      } else {
        // Add new transaction to Firestore
        const docRef = doc(collection(db, `users/${userId}/transactions`));
        await setDoc(docRef, {
          ...newTransaction,
          id: docRef.id,
        });
      }

      // Check notifications
      const updatedSummary = {
        ...getMonthSummary(),
        income:
          getMonthSummary().income +
          (transactionType === "income" ? parseFloat(amount) : 0),
        expense:
          getMonthSummary().expense +
          (transactionType === "expense" ? parseFloat(amount) : 0),
      };
      updatedSummary.balance = updatedSummary.income - updatedSummary.expense;

      // 1. แจ้งเมื่อถึงเป้าหมายกำไร
      if (
        monthlyGoal > 0 &&
        updatedSummary.balance >= monthlyGoal &&
        getMonthSummary().balance < monthlyGoal
      ) {
        setTimeout(() => {
          const successToast = document.createElement("div");
          successToast.className =
            "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
          successToast.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-md mx-4 transform transition-all animate-bounce-once">
        <div class="text-center">
          <div class="text-7xl mb-4">🎉</div>
          <h3 class="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">ยินดีด้วย!</h3>
          <p class="text-lg text-gray-700 mb-4">คุณบรรลุเป้าหมายกำไรแล้ว</p>
          <div class="flex justify-center gap-6 mb-6">
            <div class="bg-green-50 rounded-lg p-3">
              <p class="text-sm text-gray-600">กำไรปัจจุบัน</p>
              <p class="text-2xl font-bold text-green-600">฿${updatedSummary.balance.toLocaleString()}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-sm text-gray-600">เป้าหมาย</p>
              <p class="text-2xl font-bold text-purple-600">฿${monthlyGoal.toLocaleString()}</p>
            </div>
          </div>
          <button id="closeSuccess" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium">
            ปิด
          </button>
        </div>
      </div>
    `;
          document.body.appendChild(successToast);

          // Confetti effect
          for (let i = 0; i < 50; i++) {
            const confetti = document.createElement("div");
            confetti.className = "fixed animate-fall";
            confetti.style.left = Math.random() * 100 + "%";
            confetti.style.animationDelay = Math.random() * 3 + "s";
            confetti.style.fontSize = "20px";
            confetti.innerHTML = ["🎊", "🎉", "✨", "🌟"][
              Math.floor(Math.random() * 4)
            ];
            document.body.appendChild(confetti);
            setTimeout(() => document.body.removeChild(confetti), 3000);
          }

          // Style for animations
          const style = document.createElement("style");
          style.textContent = `
      @keyframes bounce-once { 
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fall {
        to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
      }
      .animate-bounce-once { animation: bounce-once 0.6s ease-out; }
      .animate-fall { animation: fall 3s linear; }
    `;
          document.head.appendChild(style);

          // Handle close button
          document.getElementById("closeSuccess").onclick = () => {
            successToast.style.opacity = "0";
            setTimeout(() => {
              document.body.removeChild(successToast);
              document.head.removeChild(style);
            }, 300);
          };
        }, 500);
      }

      // 2. แจ้งเมื่อขาดทุนมากกว่า 2 เท่าของเป้าหมาย
      if (monthlyGoal > 0 && updatedSummary.balance < -(monthlyGoal * 2)) {
        setTimeout(() => {
          const warningToast = document.createElement("div");
          warningToast.className =
            "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
          warningToast.innerHTML = `
      <div class="bg-white rounded-2xl p-8 max-w-md mx-4 transform transition-all">
        <div class="text-center">
          <div class="text-6xl mb-4 animate-pulse">⚠️</div>
          <h3 class="text-2xl font-bold mb-2 text-red-600">เตือน! ขาดทุนมากเกินไป</h3>
          <p class="text-gray-700 mb-4">ขาดทุนเกิน 2 เท่าของเป้าหมายกำไร</p>
          <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p class="text-lg text-red-800">ขาดทุนปัจจุบัน: <span class="font-bold">฿${Math.abs(
              updatedSummary.balance
            ).toLocaleString()}</span></p>
            <p class="text-sm text-red-600 mt-2">⚡ ควรตรวจสอบค่าใช้จ่ายของคุณ</p>
          </div>
          <button id="closeWarning" class="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium">
            รับทราบ
          </button>
        </div>
      </div>
    `;
          document.body.appendChild(warningToast);

          // Shake animation
          warningToast.querySelector("div").style.animation = "shake 0.5s";
          const shakeStyle = document.createElement("style");
          shakeStyle.textContent =
            "@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }";
          document.head.appendChild(shakeStyle);

          // Handle close button
          document.getElementById("closeWarning").onclick = () => {
            warningToast.style.opacity = "0";
            setTimeout(() => {
              document.body.removeChild(warningToast);
              document.head.removeChild(shakeStyle);
            }, 300);
          };
        }, 500);
      }
      // Reset form
      setDescription("");
      setAmount("");
      setShowAddModal(false);
      setShowEditModal(false); // เพิ่มถ้ายังไม่มี
      setEditingTransaction(null); // เพิ่มถ้ายังไม่มี
      setIsSaving(false); // ต้องมีบรรทัดนี้

      // Toast notification
      const toast = document.createElement("div");
      toast.className =
        "fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50";
      toast.innerHTML = "✅ บันทึกข้อมูลเรียบร้อย!";
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.transform = "translateX(0)";
      }, 100);

      setTimeout(() => {
        toast.style.transform = "translateX(400px)";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      setIsSaving(false); // ปิด loading เมื่อ error
    }
  };

  // Edit transaction
  const startEditTransaction = (transaction) => {
    setIsSaving(false); // เพิ่มบรรทัดนี้เป็นบรรทัดแรก
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setDescription(transaction.description);
    setAmount(transaction.amount.toString());
    setCategory(
      transaction.type === "expense"
        ? transaction.category
        : expenseCategories[Object.keys(expenseCategories)[0]]
    );
    setIncomeCategory(
      transaction.type === "income" ? transaction.category : "ขายสินค้า"
    );
    setDate(transaction.date);
    setShowEditModal(true);
  };

  // Delete transaction with Undo
  // Delete transaction with Undo
  const deleteTransaction = async (id) => {
    // สร้าง custom confirm modal
    const confirmModal = document.createElement("div");
    confirmModal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    confirmModal.innerHTML = `
    <div class="bg-white rounded-2xl p-8 max-w-sm mx-4 transform transition-all animate-slide-up">
      <div class="text-center">
        <div class="text-5xl mb-4 animate-pulse">🗑️</div>
        <h3 class="text-2xl font-bold text-gray-800 mb-2">ลบรายการนี้?</h3>
        <p class="text-gray-600 mb-6">คุณแน่ใจหรือไม่ที่จะลบรายการนี้</p>
        <div class="flex gap-3">
          <button id="cancelDelete" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium btn-press">
            ยกเลิก
          </button>
          <button id="confirmDelete" class="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium btn-press">
            ลบรายการ
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(confirmModal);

    // Animation
    setTimeout(() => {
      const modalContent = confirmModal.querySelector("div");
      if (modalContent) {
        modalContent.style.transform = "scale(1.05)";
        setTimeout(() => {
          modalContent.style.transform = "scale(1)";
        }, 100);
      }
    }, 10);

    // Handle cancel
    const cancelBtn = document.getElementById("cancelDelete");
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        confirmModal.style.opacity = "0";
        setTimeout(() => {
          if (document.body.contains(confirmModal)) {
            document.body.removeChild(confirmModal);
          }
        }, 300);
      };
    }

    // Handle confirm delete
    const confirmBtn = document.getElementById("confirmDelete");
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        try {
          confirmModal.style.opacity = "0";
          setTimeout(() => {
            if (document.body.contains(confirmModal)) {
              document.body.removeChild(confirmModal);
            }
          }, 300);

          // หา transaction ที่จะลบ
          const itemToDelete = transactions.find((t) => t.id === id);
          if (!itemToDelete) {
            alert("ไม่พบรายการที่ต้องการลบ");
            return;
          }

          // ลบจาก UI ก่อน
          setTransactions((prevTransactions) =>
            prevTransactions.filter((t) => t.id !== id)
          );
          setDeletedItem(itemToDelete);

          // สร้าง Undo toast
          const toast = document.createElement("div");
          toast.className =
            "fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 z-50";
          toast.innerHTML = `
          <span>🗑️ ลบรายการแล้ว</span>
          <button id="undoBtn" class="bg-white text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors">
            ↩️ ยกเลิก
          </button>
          <div class="text-gray-400 text-sm">(<span id="countdown">5</span>)</div>
        `;
          document.body.appendChild(toast);

          // Countdown
          let seconds = 5;
          const countdownInterval = setInterval(() => {
            seconds--;
            const countdownEl = document.getElementById("countdown");
            if (countdownEl) countdownEl.textContent = seconds;
            if (seconds <= 0) clearInterval(countdownInterval);
          }, 1000);

          // Handle undo
          const undoBtn = document.getElementById("undoBtn");
          if (undoBtn) {
            undoBtn.onclick = async () => {
              if (undoTimeout) {
                clearTimeout(undoTimeout);
              }
              clearInterval(countdownInterval);

              // Restore
              setTransactions((prevTransactions) => [
                ...prevTransactions,
                itemToDelete,
              ]);
              setDeletedItem(null);

              toast.style.opacity = "0";
              setTimeout(() => {
                if (document.body.contains(toast)) {
                  document.body.removeChild(toast);
                }
              }, 300);

              // Success message
              const successToast = document.createElement("div");
              successToast.className =
                "fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50";
              successToast.innerHTML = "✅ คืนค่ารายการเรียบร้อย!";
              document.body.appendChild(successToast);

              setTimeout(() => {
                successToast.style.transform = "translateX(0)";
              }, 100);

              setTimeout(() => {
                successToast.style.transform = "translateX(400px)";
                setTimeout(() => {
                  if (document.body.contains(successToast)) {
                    document.body.removeChild(successToast);
                  }
                }, 300);
              }, 2000);
            };
          }

          // Auto delete after 5 seconds
          const timeout = setTimeout(async () => {
            try {
              await deleteDoc(doc(db, `users/${userId}/transactions`, id));
              setDeletedItem(null);

              toast.style.opacity = "0";
              setTimeout(() => {
                if (document.body.contains(toast)) {
                  document.body.removeChild(toast);
                }
              }, 300);
              clearInterval(countdownInterval);
            } catch (error) {
              console.error("Error deleting:", error);
              // Restore on error
              setTransactions((prevTransactions) => [
                ...prevTransactions,
                itemToDelete,
              ]);
              alert("เกิดข้อผิดพลาดในการลบข้อมูล");
            }
          }, 5000);

          setUndoTimeout(timeout);
        } catch (error) {
          console.error("Error in delete process:", error);
          alert("เกิดข้อผิดพลาดในการลบข้อมูล");
        }
      };
    }
  };
  // Get last month summary for comparison
  const getLastMonthComparison = () => {
    const lastMonth = new Date(selectedMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const lastMonthStart = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth(),
      1
    );
    const lastMonthEnd = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      0
    );

    const lastMonthData = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= lastMonthStart && tDate <= lastMonthEnd;
    });

    const lastIncome = lastMonthData
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const lastExpense = lastMonthData
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentSummary = getMonthSummary();

    return {
      incomeChange:
        lastIncome > 0
          ? ((currentSummary.income - lastIncome) / lastIncome) * 100
          : 0,
      expenseChange:
        lastExpense > 0
          ? ((currentSummary.expense - lastExpense) / lastExpense) * 100
          : 0,
      balanceChange:
        lastIncome - lastExpense > 0
          ? ((currentSummary.balance - (lastIncome - lastExpense)) /
              (lastIncome - lastExpense)) *
            100
          : 0,
      incomeDiff: currentSummary.income - lastIncome,
      expenseDiff: currentSummary.expense - lastExpense,
      balanceDiff: currentSummary.balance - (lastIncome - lastExpense),
    };
  };

  // Get top 5 transactions
  const getTopTransactions = () => {
    const monthData = getMonthData();
    return monthData.sort((a, b) => b.amount - a.amount).slice(0, 5);
  };

  // Get interesting dates
  const getInterestingDates = () => {
    const monthData = getMonthData();
    if (monthData.length === 0) return null;

    // Group by date
    const dateGroups = {};
    monthData.forEach((t) => {
      const dateKey = t.date;
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: dateKey,
          income: 0,
          expense: 0,
          transactions: [],
        };
      }
      dateGroups[dateKey].transactions.push(t);
      if (t.type === "income") {
        dateGroups[dateKey].income += t.amount;
      } else {
        dateGroups[dateKey].expense += t.amount;
      }
    });

    const dates = Object.values(dateGroups);

    // Find best sales day
    const bestSalesDay = dates.reduce(
      (best, current) =>
        current.income > (best?.income || 0) ? current : best,
      null
    );

    // Find highest expense day
    const highestExpenseDay = dates.reduce(
      (highest, current) =>
        current.expense > (highest?.expense || 0) ? current : highest,
      null
    );

    // Find best profit day
    const bestProfitDay = dates.reduce((best, current) => {
      const currentProfit = current.income - current.expense;
      const bestProfit = best ? best.income - best.expense : -Infinity;
      return currentProfit > bestProfit ? current : best;
    }, null);

    return { bestSalesDay, highestExpenseDay, bestProfitDay };
  };
  // Change month
  const changeMonth = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  const monthSummary = getMonthSummary();
  const dailyBreakdown = getDailyBreakdown();
  const categoryBreakdown = getCategoryBreakdown();
  const monthlyTrend = getMonthlyTrend();

  if (isLocked) {
    return (
      <PinModal
        onSuccess={() => {
          setIsLocked(false);
          setLastActivity(Date.now());
          sessionStorage.setItem("pinVerified", "true");
        }}
        onClose={() => {}} // ไม่ให้ปิดได้
        mode="verify"
        username={username}
      />
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <style>{`
        /* Dark mode styles */
        .dark {
          background-color: #0f172a !important;
        }
        
        /* Backgrounds */
        .dark .bg-gradient-to-br {
          background: linear-gradient(to bottom right, #0f172a, #1e1b4b, #0f172a) !important;
        }
        .dark .bg-white {
          background-color: #1e293b !important;
        }
        .dark .bg-gray-800 {
          background-color: #0f172a !important;
        }
        .dark .bg-gray-900 {
          background-color: #020617 !important;
        }
        .dark .bg-opacity-10 {
          background-color: rgba(148, 163, 184, 0.1) !important;
        }
        
        /* Text colors */
        .dark .text-gray-300 {
          color: #e2e8f0 !important;
        }
        .dark .text-gray-400 {
          color: #cbd5e1 !important;
        }
        .dark .text-white {
          color: #f8fafc !important;
        }
        
        /* Inputs & Selects */
        .dark input, .dark select, .dark textarea {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .dark input:focus, .dark select:focus {
          border-color: #8b5cf6 !important;
          outline-color: #8b5cf6 !important;
        }
        
        /* Cards & Modals */
        .dark .backdrop-blur-lg {
          background-color: rgba(30, 41, 59, 0.95) !important;
        }
        
        /* Borders */
        .dark .border-white {
          border-color: #334155 !important;
        }
        .dark .border-opacity-10 {
          border-color: rgba(148, 163, 184, 0.2) !important;
        }
        
        /* Hover states */
        .dark .hover\\:bg-gray-700:hover {
          background-color: #334155 !important;
        }
        .dark .hover\\:bg-opacity-20:hover {
          background-color: rgba(148, 163, 184, 0.2) !important;
        }
        
        /* Charts */
        .dark .recharts-text {
          fill: #cbd5e1 !important;
        }
        .dark .recharts-cartesian-grid-horizontal line,
        .dark .recharts-cartesian-grid-vertical line {
          stroke: #334155 !important;
        }
        
        /* Scrollbar */
        .dark ::-webkit-scrollbar {
          background-color: #1e293b;
        }
        .dark ::-webkit-scrollbar-thumb {
          background-color: #475569;
          border-radius: 4px;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {loadingData ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : (
          <div className="container mx-auto p-4 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8 pt-8">
              <h1 className="text-5xl font-bold text-white mb-2">
                ระบบบัญชีธุรกิจ
              </h1>
              <p className="text-purple-200">
                จัดการรายรับรายจ่าย คำนวณกำไรขาดทุนของธุรกิจ
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-all"
                >
                  {darkMode ? "☀️" : "🌙"}
                </button>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-all"
                >
                  🎯 ตั้งเป้าหมาย
                </button>
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-white">
                {selectedMonth.toLocaleDateString("th-TH", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8">
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-2 flex gap-2">
                {["dashboard", "transactions", "statistics", "yearly"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all ${
                        activeTab === tab
                          ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg"
                          : "text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10"
                      }`}
                    >
                      {tab === "dashboard" && "ภาพรวม"}
                      {tab === "transactions" && "รายการ"}
                      {tab === "statistics" && "สถิติ"}
                      {tab === "yearly" && "รายงานประจำปี"}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Monthly Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-2xl text-white shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg opacity-90">รายรับเดือนนี้</h3>
                      <TrendingUp className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-3xl font-bold">
                      ฿{monthSummary.income.toLocaleString()}
                    </p>
                    <p className="text-sm opacity-75 mt-2">ขายสินค้า/บริการ</p>
                  </div>

                  <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 rounded-2xl text-white shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg opacity-90">รายจ่ายเดือนนี้</h3>
                      <TrendingDown className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-3xl font-bold">
                      ฿{monthSummary.expense.toLocaleString()}
                    </p>
                    <p className="text-sm opacity-75 mt-2">
                      ต้นทุน + ค่าใช้จ่าย
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl text-white shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg opacity-90">กำไรสุทธิ</h3>
                      <DollarSign className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-3xl font-bold">
                      ฿{monthSummary.balance.toLocaleString()}
                    </p>
                    <p className="text-sm opacity-75 mt-2">
                      {monthSummary.balance >= 0 ? "กำไร" : "ขาดทุน"} (
                      {monthSummary.income > 0
                        ? (
                            (monthSummary.balance / monthSummary.income) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </p>
                  </div>
                </div>

                {/* Yearly Summary Card */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    สรุปยอดรวมทั้งปี {new Date().getFullYear()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">รายรับทั้งปี</p>
                      <p className="text-2xl font-bold text-green-400">
                        ฿
                        {transactions
                          .filter(
                            (t) =>
                              new Date(t.date).getFullYear() ===
                                new Date().getFullYear() && t.type === "income"
                          )
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">รายจ่ายทั้งปี</p>
                      <p className="text-2xl font-bold text-red-400">
                        ฿
                        {transactions
                          .filter(
                            (t) =>
                              new Date(t.date).getFullYear() ===
                                new Date().getFullYear() && t.type === "expense"
                          )
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">กำไรสุทธิทั้งปี</p>
                      <p className="text-2xl font-bold text-purple-400">
                        ฿
                        {(
                          transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "income"
                            )
                            .reduce((sum, t) => sum + t.amount, 0) -
                          transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "expense"
                            )
                            .reduce((sum, t) => sum + t.amount, 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-300 text-sm">เฉลี่ยต่อเดือน</p>
                      <p className="text-2xl font-bold text-blue-400">
                        ฿
                        {Math.round(
                          (transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "income"
                            )
                            .reduce((sum, t) => sum + t.amount, 0) -
                            transactions
                              .filter(
                                (t) =>
                                  new Date(t.date).getFullYear() ===
                                    new Date().getFullYear() &&
                                  t.type === "expense"
                              )
                              .reduce((sum, t) => sum + t.amount, 0)) /
                            12
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Breakdown Chart */}
                  <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      รายรับ-รายจ่ายรายวัน
                    </h3>
                    {dailyBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dailyBreakdown}>
                          <defs>
                            <linearGradient
                              id="colorIncome"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10B981"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10B981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorExpense"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#EF4444"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#EF4444"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#4B5563",
                              border: "1px solid #6B7280",
                              borderRadius: "8px",
                              color: "#F3F4F6",
                            }}
                            labelStyle={{ color: "#E5E7EB" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#10B981"
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            name="รายรับ"
                          />
                          <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#EF4444"
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            name="รายจ่าย"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-400">
                        <p>ยังไม่มีข้อมูลในเดือนนี้</p>
                      </div>
                    )}
                  </div>

                  {/* Category Pie Chart */}
                  <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      หมวดหมู่รายจ่าย
                    </h3>
                    {categoryBreakdown.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={categoryBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categoryBreakdown.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#4B5563",
                                border: "1px solid #6B7280",
                                borderRadius: "8px",
                                color: "#F3F4F6",
                              }}
                              formatter={(value) =>
                                `฿${value.toLocaleString()}`
                              }
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {categoryBreakdown.map((cat) => (
                            <div
                              key={cat.name}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-sm text-gray-300">
                                {cat.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-400">
                        <p>ยังไม่มีข้อมูลรายจ่าย</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    แนวโน้ม 6 เดือนล่าสุด
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#4B5563",
                          border: "1px solid #6B7280",
                          borderRadius: "8px",
                          color: "#F3F4F6",
                        }}
                        labelStyle={{ color: "#E5E7EB" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        fill="#10B981"
                        name="รายรับ"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill="#EF4444"
                        name="รายจ่าย"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="space-y-6">
                {/* Search and Filter Bar */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="🔍 ค้นหารายการ..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={exportToExcel}
                        className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                      >
                        📊 Excel
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                      >
                        📄 PDF
                      </button>
                    </div>

                    {/* Filter Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Type Filter */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          ประเภท
                        </label>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                        >
                          <option value="all">✨ ทั้งหมด</option>
                          <option value="income">💰 รายรับ</option>
                          <option value="expense">💸 รายจ่าย</option>
                        </select>
                      </div>

                      {/* Period Filter */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          ช่วงเวลา
                        </label>
                        <select
                          value={filterPeriod}
                          onChange={(e) => setFilterPeriod(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                        >
                          <option value="all">📅 ทั้งหมด</option>
                          <option value="today">📌 วันนี้</option>
                          <option value="week">📆 สัปดาห์นี้</option>
                          <option value="month">📊 เดือนนี้</option>
                        </select>
                      </div>

                      {/* Sort */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          เรียงตาม
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                        >
                          <option value="newest">🔽 วันที่ล่าสุด</option>
                          <option value="oldest">🔼 วันที่เก่าสุด</option>
                          <option value="highest">💎 มากไปน้อย</option>
                          <option value="lowest">💰 น้อยไปมาก</option>
                        </select>
                      </div>
                    </div>

                    {/* Results Count */}
                    {searchTerm ||
                    filterType !== "all" ||
                    filterPeriod !== "all" ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          พบ {getFilteredTransactions(getMonthData()).length}{" "}
                          รายการ
                        </span>
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setFilterType("all");
                            setFilterPeriod("all");
                            setSortBy("newest");
                          }}
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          ❌ ล้างการค้นหา
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Favorites Quick Access - Collapsible */}
                  {favorites.length > 0 && (
                    <div className="border-t border-gray-700 pt-4">
                      <button
                        onClick={() => setShowFavorites(!showFavorites)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 bg-opacity-50 rounded-xl hover:bg-opacity-70 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⭐</span>
                          <span className="text-sm text-gray-300 font-medium">
                            รายการที่ใช้บ่อย ({favorites.length})
                          </span>
                        </div>
                        <span
                          className={`text-gray-400 transition-transform duration-300 ${
                            showFavorites ? "rotate-180" : ""
                          }`}
                        >
                          ▼
                        </span>
                      </button>

                      {/* Dropdown Content with Animation */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          showFavorites ? "max-h-96 mt-3" : "max-h-0"
                        } overflow-hidden`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2 max-h-80 overflow-y-auto favorites-scroll">
                          {favorites.map((fav, index) => (
                            <button
                              key={index}
                              onClick={() => addFromFavorite(fav)}
                              className="flex items-center justify-between p-3 bg-gray-800 bg-opacity-70 text-white rounded-lg hover:bg-opacity-100 transition-all text-sm border border-gray-700 hover:border-purple-500 group"
                            >
                              <div className="flex items-center gap-2 flex-1 text-left">
                                <span className="text-base">
                                  {fav.type === "income" ? "💰" : "💸"}
                                </span>
                                <span className="truncate">
                                  {fav.description}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-medium whitespace-nowrap ${
                                    fav.type === "income"
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  ฿{fav.amount.toLocaleString()}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(fav);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 ml-1"
                                  title="ลบ"
                                >
                                  ✕
                                </button>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Daily Transactions List */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    รายการทั้งหมดในเดือน
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {getDailyBreakdown(true).length > 0 ? (
                      getDailyBreakdown(true).map((day) => {
                        const dayTransactions = getFilteredTransactions(
                          getMonthData()
                        )
                          .filter(
                            (t) =>
                              new Date(t.date).toLocaleDateString("th-TH") ===
                              day.date
                          )
                          .filter(
                            (t) =>
                              searchTerm === "" ||
                              t.description
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              t.category
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                          );

                        if (dayTransactions.length === 0) return null;

                        return (
                          <div
                            key={day.date}
                            className="border-b border-white border-opacity-10 pb-4"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-lg font-semibold text-white">
                                {day.date}
                              </h4>
                              <div className="flex gap-4">
                                <span className="text-green-400">
                                  +฿{day.income.toLocaleString()}
                                </span>
                                <span className="text-red-400">
                                  -฿{day.expense.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dayTransactions.map((transaction) => (
                                <div
                                  key={transaction.id}
                                  className="flex justify-between items-center bg-white bg-opacity-5 p-3 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center"
                                      style={{
                                        backgroundColor:
                                          transaction.type === "income"
                                            ? incomeCategories[
                                                transaction.category
                                              ] || "#10B981"
                                            : expenseCategories[
                                                transaction.category
                                              ] || "#95AFFE",
                                      }}
                                    >
                                      {transaction.type === "income" ? (
                                        <TrendingUp className="w-5 h-5 text-white" />
                                      ) : (
                                        <TrendingDown className="w-5 h-5 text-white" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-white font-medium">
                                        {transaction.description}
                                      </p>
                                      <p className="text-gray-400 text-sm">
                                        {transaction.category}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`font-bold ${
                                        transaction.type === "income"
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {transaction.type === "income"
                                        ? "+"
                                        : "-"}
                                      ฿{transaction.amount.toLocaleString()}
                                    </span>
                                    <button
                                      onClick={() =>
                                        toggleFavorite(transaction)
                                      }
                                      className={`transition-colors ${
                                        favorites.some(
                                          (f) =>
                                            f.description ===
                                              transaction.description &&
                                            f.category === transaction.category
                                        )
                                          ? "text-yellow-400"
                                          : "text-gray-400 hover:text-yellow-400"
                                      }`}
                                      title="เพิ่มในรายการโปรด"
                                    >
                                      ⭐
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsSaving(false); // เพิ่มบรรทัดนี้
                                        startEditTransaction(transaction);
                                      }}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteTransaction(transaction.id)
                                      }
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <p>
                          {" "}
                          {searchTerm ||
                          filterType !== "all" ||
                          filterPeriod !== "all"
                            ? "ไม่พบรายการที่ค้นหา"
                            : "ยังไม่มีรายการในเดือนนี้"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Yearly Report Tab */}
            {activeTab === "yearly" && (
              <div className="space-y-6">
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    รายงานประจำปี {new Date().getFullYear()}
                  </h3>

                  {/* Yearly Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white bg-opacity-10 p-4 rounded-xl">
                      <h4 className="text-sm text-gray-300">รายรับทั้งปี</h4>
                      <p className="text-2xl font-bold text-green-400">
                        ฿
                        {transactions
                          .filter(
                            (t) =>
                              new Date(t.date).getFullYear() ===
                                new Date().getFullYear() && t.type === "income"
                          )
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-4 rounded-xl">
                      <h4 className="text-sm text-gray-300">รายจ่ายทั้งปี</h4>
                      <p className="text-2xl font-bold text-red-400">
                        ฿
                        {transactions
                          .filter(
                            (t) =>
                              new Date(t.date).getFullYear() ===
                                new Date().getFullYear() && t.type === "expense"
                          )
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-4 rounded-xl">
                      <h4 className="text-sm text-gray-300">กำไรสุทธิทั้งปี</h4>
                      <p className="text-2xl font-bold text-purple-400">
                        ฿
                        {(
                          transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "income"
                            )
                            .reduce((sum, t) => sum + t.amount, 0) -
                          transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "expense"
                            )
                            .reduce((sum, t) => sum + t.amount, 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-10 p-4 rounded-xl">
                      <h4 className="text-sm text-gray-300">
                        กำไรเฉลี่ย/เดือน
                      </h4>
                      <p className="text-2xl font-bold text-blue-400">
                        ฿
                        {Math.round(
                          (transactions
                            .filter(
                              (t) =>
                                new Date(t.date).getFullYear() ===
                                  new Date().getFullYear() &&
                                t.type === "income"
                            )
                            .reduce((sum, t) => sum + t.amount, 0) -
                            transactions
                              .filter(
                                (t) =>
                                  new Date(t.date).getFullYear() ===
                                    new Date().getFullYear() &&
                                  t.type === "expense"
                              )
                              .reduce((sum, t) => sum + t.amount, 0)) /
                            12
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Comparison Chart */}
                  <div className="bg-white bg-opacity-10 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      กำไรรายเดือน
                    </h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={Array.from({ length: 12 }, (_, i) => {
                          const month = i;
                          const year = new Date().getFullYear();
                          const monthTransactions = transactions.filter((t) => {
                            const date = new Date(t.date);
                            return (
                              date.getMonth() === month &&
                              date.getFullYear() === year
                            );
                          });
                          const income = monthTransactions
                            .filter((t) => t.type === "income")
                            .reduce((sum, t) => sum + t.amount, 0);
                          const expense = monthTransactions
                            .filter((t) => t.type === "expense")
                            .reduce((sum, t) => sum + t.amount, 0);
                          return {
                            month: new Date(year, month).toLocaleDateString(
                              "th-TH",
                              { month: "short" }
                            ),
                            income,
                            expense,
                            profit: income - expense,
                          };
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#4B5563",
                            border: "1px solid #6B7280",
                            borderRadius: "8px",
                            color: "#F3F4F6",
                          }}
                          labelStyle={{ color: "#E5E7EB" }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#10B981"
                          name="รายรับ"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="expense"
                          stroke="#EF4444"
                          name="รายจ่าย"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="#A78BFA"
                          name="กำไร"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === "statistics" && (
              <div className="space-y-6">
                {/* Top Categories */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    หมวดหมู่ที่ใช้จ่ายมากที่สุด
                  </h3>
                  {categoryBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {categoryBreakdown
                        .sort((a, b) => b.value - a.value)
                        .map((cat) => (
                          <div
                            key={cat.name}
                            className="flex items-center gap-4"
                          >
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-white">{cat.name}</span>
                                <span className="text-gray-300">
                                  ฿{cat.value.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-white bg-opacity-10 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${
                                      (cat.value / monthSummary.expense) * 100
                                    }%`,
                                    backgroundColor: cat.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p>ยังไม่มีข้อมูลรายจ่าย</p>
                    </div>
                  )}
                </div>

                {/* Monthly Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      สถิติรายเดือน
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">
                          จำนวนรายการทั้งหมด
                        </span>
                        <span className="text-white font-bold">
                          {getMonthData().length} รายการ
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">
                          รายรับเฉลี่ยต่อวัน
                        </span>
                        <span className="text-green-400 font-bold">
                          ฿
                          {(
                            monthSummary.income /
                            new Date(
                              selectedMonth.getFullYear(),
                              selectedMonth.getMonth() + 1,
                              0
                            ).getDate()
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">
                          รายจ่ายเฉลี่ยต่อวัน
                        </span>
                        <span className="text-red-400 font-bold">
                          ฿
                          {(
                            monthSummary.expense /
                            new Date(
                              selectedMonth.getFullYear(),
                              selectedMonth.getMonth() + 1,
                              0
                            ).getDate()
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">อัตรากำไร</span>
                        <span className="text-purple-400 font-bold">
                          {monthSummary.income > 0
                            ? (
                                (monthSummary.balance / monthSummary.income) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      เป้าหมายกำไร
                    </h3>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-white mb-2">
                        {monthSummary.balance >= monthlyGoal ? "🎉" : "💪"}
                      </div>
                      <p className="text-gray-300">
                        {monthlyGoal > 0
                          ? monthSummary.balance >= monthlyGoal
                            ? `บรรลุเป้าหมาย! กำไร ฿${monthSummary.balance.toLocaleString()} จากเป้า ฿${monthlyGoal.toLocaleString()}`
                            : `ยังขาดอีก ฿${(
                                monthlyGoal - monthSummary.balance
                              ).toLocaleString()} จะถึงเป้าหมาย`
                          : "ยังไม่ได้ตั้งเป้าหมาย"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Month Comparison */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    📈 เปรียบเทียบกับเดือนที่แล้ว
                  </h3>
                  {(() => {
                    const comparison = getLastMonthComparison();
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">รายรับ</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                comparison.incomeChange >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {comparison.incomeChange >= 0 ? "↑" : "↓"}{" "}
                              {Math.abs(comparison.incomeChange).toFixed(1)}%
                            </span>
                            <span className="text-gray-400 text-sm">
                              ({comparison.incomeDiff >= 0 ? "+" : ""}฿
                              {comparison.incomeDiff.toLocaleString()})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">รายจ่าย</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                comparison.expenseChange <= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {comparison.expenseChange >= 0 ? "↑" : "↓"}{" "}
                              {Math.abs(comparison.expenseChange).toFixed(1)}%
                            </span>
                            <span className="text-gray-400 text-sm">
                              ({comparison.expenseDiff >= 0 ? "+" : ""}฿
                              {comparison.expenseDiff.toLocaleString()})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                          <span className="text-gray-300 font-medium">
                            กำไรสุทธิ
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-lg ${
                                comparison.balanceChange >= 0
                                  ? "text-purple-400"
                                  : "text-red-400"
                              }`}
                            >
                              {comparison.balanceChange >= 0 ? "↑" : "↓"}{" "}
                              {Math.abs(comparison.balanceChange).toFixed(1)}%
                            </span>
                            <span className="text-gray-400 text-sm">
                              ({comparison.balanceDiff >= 0 ? "+" : ""}฿
                              {comparison.balanceDiff.toLocaleString()})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Top 5 Transactions */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    💰 Top 5 รายการมูลค่าสูงสุด
                  </h3>
                  {getTopTransactions().length > 0 ? (
                    <div className="space-y-3">
                      {getTopTransactions().map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                            ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                                : index === 1
                                ? "bg-gradient-to-r from-gray-400 to-gray-500"
                                : index === 2
                                ? "bg-gradient-to-r from-orange-600 to-orange-700"
                                : "bg-gray-600"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {transaction.description}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {transaction.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-bold ${
                                transaction.type === "income"
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {transaction.type === "income" ? "+" : "-"}฿
                              {transaction.amount.toLocaleString()}
                            </span>
                            <p className="text-gray-500 text-xs">
                              {new Date(transaction.date).toLocaleDateString(
                                "th-TH",
                                { day: "numeric", month: "short" }
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p>ยังไม่มีรายการ</p>
                    </div>
                  )}
                </div>

                {/* Interesting Dates */}
                <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">
                    📊 วันที่น่าสนใจ
                  </h3>
                  {(() => {
                    const dates = getInterestingDates();
                    if (!dates) {
                      return (
                        <div className="text-center text-gray-400 py-8">
                          <p>ยังไม่มีข้อมูล</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        {dates.bestSalesDay && (
                          <div className="bg-green-500 bg-opacity-20 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-green-400 font-medium">
                                  📈 วันที่ขายดีที่สุด
                                </p>
                                <p className="text-white text-lg font-bold">
                                  {new Date(
                                    dates.bestSalesDay.date
                                  ).toLocaleDateString("th-TH", {
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 text-2xl font-bold">
                                  ฿{dates.bestSalesDay.income.toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {
                                    dates.bestSalesDay.transactions.filter(
                                      (t) => t.type === "income"
                                    ).length
                                  }{" "}
                                  รายการ
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {dates.highestExpenseDay && (
                          <div className="bg-red-500 bg-opacity-20 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-red-400 font-medium">
                                  💸 วันที่ใช้จ่ายมากสุด
                                </p>
                                <p className="text-white text-lg font-bold">
                                  {new Date(
                                    dates.highestExpenseDay.date
                                  ).toLocaleDateString("th-TH", {
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-red-400 text-2xl font-bold">
                                  ฿
                                  {dates.highestExpenseDay.expense.toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {
                                    dates.highestExpenseDay.transactions.filter(
                                      (t) => t.type === "expense"
                                    ).length
                                  }{" "}
                                  รายการ
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {dates.bestProfitDay && (
                          <div className="bg-purple-500 bg-opacity-20 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-purple-400 font-medium">
                                  💎 วันที่กำไรสูงสุด
                                </p>
                                <p className="text-white text-lg font-bold">
                                  {new Date(
                                    dates.bestProfitDay.date
                                  ).toLocaleDateString("th-TH", {
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-purple-400 text-2xl font-bold">
                                  ฿
                                  {(
                                    dates.bestProfitDay.income -
                                    dates.bestProfitDay.expense
                                  ).toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  กำไร{" "}
                                  {(
                                    ((dates.bestProfitDay.income -
                                      dates.bestProfitDay.expense) /
                                      dates.bestProfitDay.income) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            {/* Floating Action Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
            >
              <Plus className="w-8 h-8 text-white" />
            </button>

            {/* Add Transaction Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-6">
                    เพิ่มรายการใหม่
                  </h3>

                  {/* Transaction Type Selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setTransactionType("income")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        transactionType === "income"
                          ? "bg-green-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      รายรับ
                    </button>
                    <button
                      onClick={() => setTransactionType("expense")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        transactionType === "expense"
                          ? "bg-red-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      รายจ่าย
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        รายการ <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (validationErrors.description) {
                            setValidationErrors({
                              ...validationErrors,
                              description: "",
                            });
                          }
                        }}
                        className={`w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none transition-all ${
                          validationErrors.description
                            ? "border-2 border-red-500 focus:ring-2 focus:ring-red-500"
                            : "focus:ring-2 focus:ring-purple-500"
                        }`}
                        placeholder="ระบุรายการ"
                      />
                      {validationErrors.description && (
                        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                          <span>⚠️</span> {validationErrors.description}
                        </p>
                      )}
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          หมวดหมู่
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {Object.keys(expenseCategories).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {transactionType === "income" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          ประเภทรายรับ
                        </label>
                        <select
                          value={incomeCategory}
                          onChange={(e) => setIncomeCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {Object.keys(incomeCategories).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        จำนวนเงิน <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          if (validationErrors.amount) {
                            setValidationErrors({
                              ...validationErrors,
                              amount: "",
                            });
                          }
                        }}
                        className={`w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none transition-all ${
                          validationErrors.amount
                            ? "border-2 border-red-500 focus:ring-2 focus:ring-red-500"
                            : "focus:ring-2 focus:ring-purple-500"
                        }`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      {validationErrors.amount && (
                        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                          <span>⚠️</span> {validationErrors.amount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        วันที่
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setValidationErrors({});
                        setDescription("");
                        setAmount("");
                      }}
                      className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Test - ปุ่มทำงาน!");
                        addTransaction();
                      }}
                      style={{ zIndex: 9999, position: "relative" }}
                      className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl hover:opacity-90 transition-opacity"
                    >
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Transaction Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-6">
                    แก้ไขรายการ
                  </h3>

                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setTransactionType("income")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        transactionType === "income"
                          ? "bg-green-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      รายรับ
                    </button>
                    <button
                      onClick={() => setTransactionType("expense")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        transactionType === "expense"
                          ? "bg-red-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      รายจ่าย
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        รายการ <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (validationErrors.description) {
                            setValidationErrors({
                              ...validationErrors,
                              description: "",
                            });
                          }
                        }}
                        className={`w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none transition-all ${
                          validationErrors.description
                            ? "border-2 border-red-500 focus:ring-2 focus:ring-red-500"
                            : "focus:ring-2 focus:ring-purple-500"
                        }`}
                        placeholder="ระบุรายการ"
                      />
                      {validationErrors.description && (
                        <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                          <span>⚠️</span> {validationErrors.description}
                        </p>
                      )}
                    </div>

                    {transactionType === "expense" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          หมวดหมู่
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {Object.keys(expenseCategories).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {transactionType === "income" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          ประเภทรายรับ
                        </label>
                        <select
                          value={incomeCategory}
                          onChange={(e) => setIncomeCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {Object.keys(incomeCategories).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        จำนวนเงิน
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        วันที่
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingTransaction(null);
                        setDescription("");
                        setAmount("");
                        setValidationErrors({});
                        setIsSaving(false);
                      }}
                      className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={addTransaction}
                      disabled={isSaving}
                      className={`flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl transition-all ${
                        isSaving
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-90"
                      }`}
                    >
                      {isSaving ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          กำลังบันทึก...
                        </span>
                      ) : (
                        "บันทึกการแก้ไข"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Setting Modal */}
            {showGoalModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-6">
                    🎯 ตั้งเป้าหมายรายเดือน
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        เป้าหมายกำไรต่อเดือน
                      </label>
                      <input
                        type="number"
                        value={monthlyGoal}
                        onChange={(e) => setMonthlyGoal(e.target.value)}
                        onBlur={(e) =>
                          setMonthlyGoal(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="bg-yellow-900 bg-opacity-50 p-4 rounded-xl">
                      <p className="text-yellow-200 text-sm">
                        💡 ระบบจะแจ้งเตือนเมื่อรายจ่ายเกินเป้าหมายที่ตั้งไว้
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowGoalModal(false)}
                      className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={async () => {
                        await saveMonthlyGoal(monthlyGoal);
                        setShowGoalModal(false);
                        // Success toast
                        const toast = document.createElement("div");
                        toast.className =
                          "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-gray-800 px-8 py-6 rounded-2xl shadow-2xl z-50 text-center min-w-[300px]";
                        toast.innerHTML = `
  <div class="text-6xl mb-4">🎯</div>
  <h3 class="text-2xl font-bold mb-2">บันทึกเป้าหมายสำเร็จ!</h3>
  <p class="text-gray-600">เป้าหมายกำไร: <span class="font-bold text-purple-600">฿${monthlyGoal.toLocaleString()}</span></p>
  <div class="mt-4 text-sm text-gray-500">ระบบจะแจ้งเตือนเมื่อบรรลุเป้าหมาย</div>
`;
                        document.body.appendChild(toast);

                        setTimeout(() => {
                          toast.style.opacity = "0";
                          toast.style.transition = "opacity 0.5s";
                          setTimeout(() => {
                            toast.style.opacity = "1";
                          }, 50);
                        }, 10);

                        setTimeout(() => {
                          toast.style.opacity = "0";
                          setTimeout(
                            () => document.body.removeChild(toast),
                            500
                          );
                        }, 2500);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl hover:opacity-90 transition-opacity"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Report (hidden) */}
      <div id="printable-report" style={{ display: "none" }}>
        <h1>
          รายงานประจำเดือน{" "}
          {selectedMonth.toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          })}
        </h1>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                วันที่
              </th>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                ประเภท
              </th>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                รายการ
              </th>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                หมวดหมู่
              </th>
              <th style={{ border: "1px solid black", padding: "8px" }}>
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody>
            {getMonthData().map((t) => (
              <tr key={t.id}>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {new Date(t.date).toLocaleDateString("th-TH")}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {t.type === "income" ? "รายรับ" : "รายจ่าย"}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {t.description}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {t.category}
                </td>
                <td
                  style={{
                    border: "1px solid black",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {t.type === "income" ? "+" : "-"}฿{t.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan="4"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  fontWeight: "bold",
                }}
              >
                รวมรายรับ
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ฿{monthSummary.income.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td
                colSpan="4"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  fontWeight: "bold",
                }}
              >
                รวมรายจ่าย
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ฿{monthSummary.expense.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td
                colSpan="4"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  fontWeight: "bold",
                }}
              >
                กำไรสุทธิ
              </td>
              <td
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ฿{monthSummary.balance.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
