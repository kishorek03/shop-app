import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const languages = {
  en: {
    settings: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    account: 'Account',
    deleteAccount: 'Delete Account',
    logout: 'Logout',
    selectLanguage: 'Select Language',
    confirmDelete: 'Are you sure you want to delete your account? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    error: 'Error',
    tryAgain: 'Please try again.',
    loggingOut: 'Logging out...',
    report: 'Report',
    sales: 'Sales',
    expense: 'Expense',
    salesSummary: 'Today\'s Sales Summary',
    todaysOrders: 'Today\'s Orders',
    totalAmount: 'Total Amount',
    cashSales: 'Cash Sales',
    upiSales: 'UPI Sales',
    item: 'Item',
    product: 'Product',
    selectProduct: 'Select Product',
    quantity: 'Quantity',
    parcel: 'Parcel',
    customPrice: 'Custom Price',
    salePrice: 'Sale Price',
    enterPrice: 'Enter Price',
    enterQuantity: 'Enter Quantity',
    flavour: 'Flavour',
    selectFlavour: 'Select Flavour',
    addOn: 'Add On',
    noAddOn: 'No Add On',
    paymentMode: 'Payment Mode',
    cash: 'Cash',
    upi: 'UPI',
    submitOrder: 'Submit Order',
    lastOrder: 'Last Order',
    success: 'Success',
    orderSubmitted: 'Order Submitted Successfully',
    loadingData: 'Loading Data...',
    remove: 'Remove',
    add: 'Add',
    amount: 'Amount',
    unit: 'Unit',
    category: 'Category',
    payment: 'Payment',
    date: 'Date',
    enterItem: 'Enter item',
    enterAmount: 'Enter amount',
    selectUnit: 'Select unit',
    selectCategory: 'Select category',
    submitExpense: 'Submit Expense',
    lastExpense: 'Last Expense',
    expenseRecorded: 'Expense recorded successfully!',
    remarks: 'Remarks',
    enterRemarks: 'Enter remarks (optional)',
    logoutConfirm: 'Are you sure you want to Log out?',
    welcomeBack: 'Welcome back!',
    signInToContinue: 'Sign in to continue',
    username: 'Username',
    password: 'Password',
    login: 'Login',
    signIn: 'Sign In',
    totalSales: 'Total Sales',
    totalExpense: 'Total Expense',
    netAmount: 'Net Amount',
    salesBreakdown: 'Sales Breakdown',
    expenseBreakdown: 'Expense Breakdown',
    openingCash: 'Opening Cash',
    currentCash: 'Current Cash',
    setOpeningBalance: 'Set Opening Balance',
    enterOpeningBalance: 'Enter Opening Balance',
    recordCashMovement: 'Record Cash Movement',
    enterValidAmount: 'Please enter a valid amount.',
    cashMovementRecorded: 'Cash movement recorded successfully!',
    failedRecordMovement: 'Failed to record movement.',
    failedRecordMovementTryAgain: 'Failed to record cash movement. Please try again.',
    movementType: 'Movement Type',
    cashDeposit: 'Cash Deposit',
    cashPayout: 'Cash Payout',
    profitWithdrawal: 'Profit Withdrawal',
    cashIn: 'Cash In',
    enterRemarksOptional: 'Enter remarks (optional)',
    save: 'Save',
    cancel: 'Cancel',
    appName: 'Iyarkai Vanam',
    appSubtitle: 'Transaction Management',
    selectExpenseItem: 'Select Expense Item',
    searchExpenseItem: 'Search item (English or தமிழ்)...',
    customExpense: '+ Custom Expense / Other',
    customExpenseOption: 'Custom Expense / Other',
    customExpenseDesc: 'One-off unexpected expense (e.g. repair, festival)',
    recurringItems: 'Recurring Expense Items',
    browseCatalog: 'Browse Catalog Items',
    customExpenseActive: 'Custom Expense Mode Active',
    defaultPriceHint: 'Default price',
    monthlyFlavours: 'Monthly Flavour Sales',
    noFlavourSalesMonth: 'No flavour sales this month yet',
    monthlyExpenseBreakdown: 'Monthly Expense Breakdown',
    monthlyExpense: 'Month Expense',
    groupedByProduct: 'Grouped by Product / Item',
    totalMonthExpense: 'Total Month Expense',
    pnl: 'Profit & Loss',
    netProfit: 'Net Profit',
    netLoss: 'Net Loss',
    netPnL: 'Net Profit / Loss',
    profitMargin: 'Profit Margin',
    totalExpensesCount: 'Total Expenses Count',
    periodBreakdown: 'Period Breakdown',
    period: 'Period',
    categoryExpenseShare: 'Expense Share by Category',
    noPnlData: 'No profit & loss data available for this period',
  },
  ta: {
    settings: 'அமைப்புகள்',
    preferences: 'விருப்பங்கள்',
    language: 'மொழி',
    account: 'கணக்கு',
    deleteAccount: 'கணக்கை நீக்கு',
    logout: 'வெளியேறு',
    selectLanguage: 'மொழியைத் தேர்வு செய்க',
    confirmDelete: 'உங்கள் கணக்கை நீக்க விரும்புகிறீர்களா? இந்த செயலை மீளமைக்க முடியாது.',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    error: 'பிழை',
    tryAgain: 'தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    loggingOut: 'வெளியேறுகிறது...',
    report: 'அறிக்கை',
    sales: 'விற்பனைகள்',
    expense: 'செலவுகள்',
    salesSummary: 'இன்றைய விற்பனை சுருக்கம்',
    todaysOrders: 'இன்றைய ஆர்டர்கள்',
    totalAmount: 'மொத்த தொகை',
    cashSales: 'பண விற்பனை',
    upiSales: 'UPI விற்பனை',
    item: 'உருப்படி',
    product: 'பொருள்',
    selectProduct: 'பொருளைத் தேர்ந்தெடுக்கவும்',
    quantity: 'அளவு',
    parcel: 'பார்சல்',
    customPrice: 'விருப்ப விலை',
    salePrice: 'விற்பனை விலை',
    enterPrice: 'விலையை உள்ளிடவும்',
    enterQuantity: 'அளவை உள்ளிடவும்',
    flavour: 'சுவை',
    selectFlavour: 'சுவையைத் தேர்ந்தெடுக்கவும்',
    addOn: 'கூட்டு',
    noAddOn: 'கூட்டு இல்லை',
    paymentMode: 'கட்டண முறை',
    cash: 'பணம்',
    upi: 'UPI',
    submitOrder: 'ஆர்டரை சமர்ப்பிக்கவும்',
    lastOrder: 'கடைசி ஆர்டர்',
    success: 'வெற்றி',
    orderSubmitted: 'ஆர்டர் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது',
    loadingData: 'தரவு ஏற்றப்படுகிறது...',
    remove: 'அகற்று',
    add: 'சேர்',
    amount: 'தொகை',
    unit: 'அலகு',
    category: 'வகை',
    payment: 'கட்டணம்',
    date: 'தேதி',
    enterItem: 'உருப்படியை உள்ளிடவும்',
    enterAmount: 'தொகையை உள்ளிடவும்',
    selectUnit: 'அலகைத் தேர்ந்தெடுக்கவும்',
    selectCategory: 'வகையைத் தேர்ந்தெடுக்கவும்',
    submitExpense: 'செலவினை சமர்ப்பிக்கவும்',
    lastExpense: 'கடைசி செலவு',
    expenseRecorded: 'செலவு வெற்றிகரமாக பதிவு செய்யப்பட்டது!',
    remarks: 'குறிப்புகள்',
    enterRemarks: 'குறிப்புகளை உள்ளிடவும் (விருப்பத்திற்கானது)',
    logoutConfirm: 'நீங்கள் நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்!',
    signInToContinue: 'தொடர உள்நுழைக',
    username: 'பயனர்பெயர்',
    password: 'கடவுச்சொல்',
    login: 'உள்நுழை',
    signIn: 'உள்நுழைக',
    totalSales: 'மொத்த விற்பனை',
    totalExpense: 'மொத்த செலவு',
    netAmount: 'நிகரத் தொகை',
    salesBreakdown: 'விற்பனை விவரம்',
    expenseBreakdown: 'செலவு விவரம்',
    openingCash: 'ஆரம்ப ரொக்கம்',
    currentCash: 'தற்போதைய ரொக்கம்',
    setOpeningBalance: 'ஆரம்ப ரொக்கத்தை அமைக்கவும்',
    enterOpeningBalance: 'ஆரம்ப ரொக்கத்தை உள்ளிடவும்',
    recordCashMovement: 'ரொக்க பரிமாற்றத்தைப் பதிவு செய்க',
    enterValidAmount: 'தயவுசெய்து சரியான தொகையை உள்ளிடவும்.',
    cashMovementRecorded: 'ரொக்க பரிமாற்றம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!',
    failedRecordMovement: 'பரிமாற்றத்தைப் பதிவு செய்யத் தவறிவிட்டது.',
    failedRecordMovementTryAgain: 'ரொக்க பரிமாற்றத்தைப் பதிவு செய்யத் தவறிவிட்டது. மீண்டும் முயற்சிக்கவும்.',
    movementType: 'பரிமாற்ற வகை',
    cashDeposit: 'ரொக்க வைப்பு',
    cashPayout: 'ரொக்கச் செலவு',
    profitWithdrawal: 'இலாபத் தொகை எடுக்கப்பட்டது',
    cashIn: 'ரொக்கம் உள்ளீடு',
    enterRemarksOptional: 'குறிப்புகளை உள்ளிடவும் (விருப்பத்திற்கானது)',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    appName: 'இயற்கை வனம்',
    appSubtitle: 'பரிவர்த்தனை மேலாண்மை',
    selectExpenseItem: 'செலவு உருப்படியைத் தேர்ந்தெடுக்கவும்',
    searchExpenseItem: 'உருப்படியைத் தேடுங்கள் (ஆங்கிலம் அல்லது தமிழ்)...',
    customExpense: '+ தனிப்பயன் செலவு / மற்றவை',
    customExpenseOption: 'தனிப்பயன் செலவு / மற்றவை',
    customExpenseDesc: 'எதிர்பாராத செலவு (எ.கா. பழுது, திருவிழா)',
    recurringItems: 'வழக்கமான செலவு உருப்படிகள்',
    browseCatalog: 'உருப்படிகளைப் பார்க்கவும்',
    customExpenseActive: 'தனிப்பயன் செலவு முறை',
    defaultPriceHint: 'வழக்கமான விலை',
    monthlyFlavours: 'இந்த மாத சுவை விற்பனை',
    noFlavourSalesMonth: 'இந்த மாதம் சுவை விற்பனை எதுவும் இல்லை',
    monthlyExpenseBreakdown: 'மாதாந்திர செலவு விவரம்',
    monthlyExpense: 'மாதச் செலவு',
    groupedByProduct: 'பொருட்கள் வாரியாக',
    totalMonthExpense: 'மொத்த மாதச் செலவு',
    pnl: 'லாபம் & நஷ்டம்',
    netProfit: 'நிகர லாபம்',
    netLoss: 'நிகர நஷ்டம்',
    netPnL: 'நிகர லாபம் / நஷ்டம்',
    profitMargin: 'லாப வரம்பு',
    totalExpensesCount: 'மொத்த செலவு பதிவுகள்',
    periodBreakdown: 'கால இடைவெளி விவரம்',
    period: 'காலம்',
    categoryExpenseShare: 'வகை வாரியாக செலவுப் பங்கு',
    noPnlData: 'இந்த காலத்திற்கு லாப நஷ்ட விவரங்கள் இல்லை',
  }
};

export const languageNames = {
  en: {
    native: 'English',
    script: 'ஆங்கிலம்',
  },
  ta: {
    native: 'தமிழ்',
    script: 'Tamil',
  }
};

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      await AsyncStorage.setItem('appLanguage', languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key) => {
    return languages[currentLanguage]?.[key] || languages['en'][key] || key;
  };

  const getLanguageName = (code) => {
    const lang = languageNames[code];
    if (!lang) return code;
    return `${lang.native} (${lang.script})`;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, getLanguageName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 