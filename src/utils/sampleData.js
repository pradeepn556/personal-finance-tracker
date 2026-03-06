// ============================================================
// sampleData.js — Demo data for GitHub Pages live preview
// Auto-loaded on first visit when localStorage is empty.
// Uses realistic Australian financial data (AUD, ASX, ANZ).
// ============================================================

// Generate a date string relative to today
// offset = days from today (negative = past)
function d(offsetDays) {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

// ── INCOME ──────────────────────────────────────────────────
// Fortnightly salary + partner income + occasional side hustle
export const SAMPLE_INCOME = [
  // My salary — fortnightly for ~6 months
  { id: 'inc_s01', date: d(-168), source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s02', date: d(-154), source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s03', date: d(-140), source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s04', date: d(-126), source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s05', date: d(-112), source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s06', date: d(-98),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s07', date: d(-84),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s08', date: d(-70),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s09', date: d(-56),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s10', date: d(-42),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: 'Includes annual pay review' },
  { id: 'inc_s11', date: d(-28),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },
  { id: 'inc_s12', date: d(-14),  source: 'Salary',      amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job',    recipient: 'Me',      notes: '' },

  // Partner salary — fortnightly
  { id: 'inc_p01', date: d(-161), source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p02', date: d(-147), source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p03', date: d(-133), source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p04', date: d(-119), source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p05', date: d(-105), source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p06', date: d(-91),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p07', date: d(-77),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p08', date: d(-63),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p09', date: d(-49),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p10', date: d(-35),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p11', date: d(-21),  source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },
  { id: 'inc_p12', date: d(-7),   source: 'Partner Salary', amount: 200000, payCycle: 'fortnightly', incomeFrom: 'Main Job', recipient: 'Partner', notes: '' },

  // Side hustle + one-off
  { id: 'inc_sh1', date: d(-110), source: 'Freelance',    amount: 1200, payCycle: 'one-off',      incomeFrom: 'Side Hustle', recipient: 'Me',    notes: 'UX consulting project' },
  { id: 'inc_sh2', date: d(-60),  source: 'Freelance',    amount: 800,  payCycle: 'one-off',      incomeFrom: 'Side Hustle', recipient: 'Me',    notes: 'Workshop facilitation' },
  { id: 'inc_sh3', date: d(-20),  source: 'Freelance',    amount: 1500, payCycle: 'one-off',      incomeFrom: 'Side Hustle', recipient: 'Me',    notes: 'Product strategy retainer' },
  { id: 'inc_tax', date: d(-90),  source: 'Tax Refund',   amount: 2340, payCycle: 'one-off',      incomeFrom: 'Other',       recipient: 'Shared', notes: 'ATO FY25 refund' },
];

// ── INVESTMENTS ─────────────────────────────────────────────
// Mix of ASX, US stocks, and crypto. Some open, some closed.
export const SAMPLE_INVESTMENTS = [
  // ASX stocks — open positions
  { id: 'inv_s01', date: d(-480), symbol: 'ANZ.AX',  type: 'ASX Stock', quantity: 150, purchasePrice: 24.80, currentPrice: 31.20, isClosed: false, soldDate: null, soldPrice: null, notes: 'Core banking hold' },
  { id: 'inv_s02', date: d(-310), symbol: 'ANZ.AX',  type: 'ASX Stock', quantity: 80,  purchasePrice: 27.40, currentPrice: 31.20, isClosed: false, soldDate: null, soldPrice: null, notes: 'Added on dip' },
  { id: 'inv_s03', date: d(-520), symbol: 'WOW.AX',  type: 'ASX Stock', quantity: 100, purchasePrice: 33.50, currentPrice: 37.80, isClosed: false, soldDate: null, soldPrice: null, notes: '' },
  { id: 'inv_s04', date: d(-200), symbol: 'WTC.AX',  type: 'ASX Stock', quantity: 25,  purchasePrice: 98.20, currentPrice: 142.50, isClosed: false, soldDate: null, soldPrice: null, notes: 'High conviction growth' },
  { id: 'inv_s05', date: d(-90),  symbol: 'WTC.AX',  type: 'ASX Stock', quantity: 10,  purchasePrice: 118.60, currentPrice: 142.50, isClosed: false, soldDate: null, soldPrice: null, notes: 'Added on pullback' },
  { id: 'inv_s06', date: d(-150), symbol: 'CBA.AX',  type: 'ASX Stock', quantity: 30,  purchasePrice: 118.40, currentPrice: 152.30, isClosed: false, soldDate: null, soldPrice: null, notes: '' },

  // ASX ETFs
  { id: 'inv_e01', date: d(-600), symbol: 'VGS.AX',  type: 'ETF',       quantity: 200, purchasePrice: 88.20, currentPrice: 118.40, isClosed: false, soldDate: null, soldPrice: null, notes: 'Global index core' },
  { id: 'inv_e02', date: d(-365), symbol: 'VGS.AX',  type: 'ETF',       quantity: 50,  purchasePrice: 102.50, currentPrice: 118.40, isClosed: false, soldDate: null, soldPrice: null, notes: 'Annual top-up' },
  { id: 'inv_e03', date: d(-180), symbol: 'A200.AX', type: 'ETF',       quantity: 120, purchasePrice: 108.30, currentPrice: 119.60, isClosed: false, soldDate: null, soldPrice: null, notes: 'ASX 200 exposure' },
  { id: 'inv_e04', date: d(-90),  symbol: 'NDQ.AX',  type: 'ETF',       quantity: 60,  purchasePrice: 42.80, currentPrice: 51.20,  isClosed: false, soldDate: null, soldPrice: null, notes: 'NASDAQ via ASX' },

  // US stocks
  { id: 'inv_u01', date: d(-420), symbol: 'AAPL',    type: 'US Stock',  quantity: 20,  purchasePrice: 162.00, currentPrice: 218.50, isClosed: false, soldDate: null, soldPrice: null, notes: '' },
  { id: 'inv_u02', date: d(-280), symbol: 'NVDA',    type: 'US Stock',  quantity: 15,  purchasePrice: 480.00, currentPrice: 875.00, isClosed: false, soldDate: null, soldPrice: null, notes: 'AI theme play' },
  { id: 'inv_u03', date: d(-120), symbol: 'MSFT',    type: 'US Stock',  quantity: 8,   purchasePrice: 380.00, currentPrice: 415.00, isClosed: false, soldDate: null, soldPrice: null, notes: '' },

  // Crypto
  { id: 'inv_c01', date: d(-730), symbol: 'BTC',     type: 'Crypto',    quantity: 0.35, purchasePrice: 28000, currentPrice: 92000, isClosed: false, soldDate: null, soldPrice: null, notes: 'Long term hold' },
  { id: 'inv_c02', date: d(-400), symbol: 'ETH',     type: 'Crypto',    quantity: 2.5,  purchasePrice: 1850,  currentPrice: 3400,  isClosed: false, soldDate: null, soldPrice: null, notes: '' },
  { id: 'inv_c03', date: d(-200), symbol: 'SOL',     type: 'Crypto',    quantity: 12,   purchasePrice: 42.00, currentPrice: 178.00, isClosed: false, soldDate: null, soldPrice: null, notes: 'High risk small allocation' },

  // Closed / sold positions (realized P&L)
  { id: 'inv_cl1', date: d(-540), symbol: 'BHP.AX',  type: 'ASX Stock', quantity: 80,  purchasePrice: 38.20, currentPrice: 43.50, isClosed: true, soldDate: d(-120), soldPrice: 48.60, notes: 'Took profits at target' },
  { id: 'inv_cl2', date: d(-380), symbol: 'MQG.AX',  type: 'ASX Stock', quantity: 15,  purchasePrice: 182.00, currentPrice: 190.00, isClosed: true, soldDate: d(-90), soldPrice: 205.50, notes: '' },
  { id: 'inv_cl3', date: d(-500), symbol: 'TSLA',    type: 'US Stock',  quantity: 10,  purchasePrice: 220.00, currentPrice: 190.00, isClosed: true, soldDate: d(-200), soldPrice: 178.00, notes: 'Stop loss hit' },
  { id: 'inv_cl4', date: d(-300), symbol: 'DOGE',    type: 'Crypto',    quantity: 5000, purchasePrice: 0.085, currentPrice: 0.15, isClosed: true, soldDate: d(-60), soldPrice: 0.18, notes: 'Quick trade, took gains' },
];

// ── EXPENSES ─────────────────────────────────────────────────
// 3 months of realistic Australian household expenses
export const SAMPLE_EXPENSES = [
  // Groceries
  { id: 'exp_g01', date: d(-5),  description: 'WOOLWORTHS PARRAMATTA',      amount: 142.30, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g02', date: d(-12), description: 'COLES WESTFIELD SYDNEY',     amount: 89.50,  category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g03', date: d(-19), description: 'WOOLWORTHS PARRAMATTA',      amount: 165.80, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g04', date: d(-26), description: 'ALDI SEVEN HILLS',           amount: 74.20,  category: 'Groceries',              paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_g05', date: d(-33), description: 'WOOLWORTHS PARRAMATTA',      amount: 131.60, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g06', date: d(-40), description: 'HARRIS FARM MARKETS',        amount: 58.40,  category: 'Groceries',              paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_g07', date: d(-47), description: 'COLES PARRAMATTA',           amount: 112.90, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g08', date: d(-54), description: 'WOOLWORTHS 1106 PARRAMATTA', amount: 148.20, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g09', date: d(-61), description: 'ALDI SEVEN HILLS',           amount: 62.80,  category: 'Groceries',              paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_g10', date: d(-75), description: 'WOOLWORTHS PARRAMATTA',      amount: 137.50, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_g11', date: d(-89), description: 'COSTCO AUBURN',              amount: 212.40, category: 'Groceries',              paymentMethod: 'ANZ Amex', notes: 'Bulk buy' },

  // Dining & Takeaway
  { id: 'exp_d01', date: d(-3),  description: 'GYG BROADWAY',               amount: 28.50,  category: 'Dining & Takeaway',      paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_d02', date: d(-8),  description: 'THAI ORCHID PARRAMATTA',     amount: 64.00,  category: 'Dining & Takeaway',      paymentMethod: 'CommBank Everyday', notes: 'Dinner with friends' },
  { id: 'exp_d03', date: d(-15), description: 'MCDONALD\'S PARRAMATTA',     amount: 22.80,  category: 'Dining & Takeaway',      paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_d04', date: d(-22), description: 'NANDOS WESTFIELD',           amount: 48.50,  category: 'Dining & Takeaway',      paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_d05', date: d(-29), description: 'DOMINOS SEVEN HILLS',        amount: 34.90,  category: 'Dining & Takeaway',      paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_d06', date: d(-36), description: 'SUSHI TRAIN PARRAMATTA',     amount: 42.00,  category: 'Dining & Takeaway',      paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_d07', date: d(-50), description: 'HUNGRY JACK\'S ROSEHILL',   amount: 19.60,  category: 'Dining & Takeaway',      paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_d08', date: d(-65), description: 'RESTAURANT THAI LOTUS',      amount: 72.00,  category: 'Dining & Takeaway',      paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_d09', date: d(-78), description: 'KFC ROSEHILL',               amount: 31.40,  category: 'Dining & Takeaway',      paymentMethod: 'CommBank Everyday', notes: '' },

  // Coffee
  { id: 'exp_cf1', date: d(-2),  description: 'THE BREW SPOT PARRAMATTA',   amount: 9.50,   category: 'Coffee & Drinks',        paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_cf2', date: d(-4),  description: 'COFFEE BEAN WESTMEAD',       amount: 8.80,   category: 'Coffee & Drinks',        paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_cf3', date: d(-7),  description: 'STARBUCKS PARRAMATTA',       amount: 11.50,  category: 'Coffee & Drinks',        paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_cf4', date: d(-9),  description: 'CAFE BLEND NORWEST',         amount: 8.50,   category: 'Coffee & Drinks',        paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_cf5', date: d(-11), description: 'THE BREW SPOT PARRAMATTA',   amount: 9.50,   category: 'Coffee & Drinks',        paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_cf6', date: d(-14), description: 'ESPRESSO BAR WESTMEAD',      amount: 7.80,   category: 'Coffee & Drinks',        paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_cf7', date: d(-30), description: 'STARBUCKS PARRAMATTA',       amount: 12.00,  category: 'Coffee & Drinks',        paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_cf8', date: d(-60), description: 'BARISTA BAR SEVEN HILLS',    amount: 8.50,   category: 'Coffee & Drinks',        paymentMethod: 'CommBank Everyday', notes: '' },

  // Subscriptions
  { id: 'exp_sb1', date: d(-5),  description: 'NETFLIX MONTHLY',            amount: 22.99,  category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb2', date: d(-5),  description: 'SPOTIFY FAMILY',             amount: 17.99,  category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb3', date: d(-5),  description: 'APPLE.COM ICLOUD',           amount: 4.49,   category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb4', date: d(-35), description: 'NETFLIX MONTHLY',            amount: 22.99,  category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb5', date: d(-35), description: 'SPOTIFY FAMILY',             amount: 17.99,  category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb6', date: d(-65), description: 'NETFLIX MONTHLY',            amount: 22.99,  category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_sb7', date: d(-65), description: 'DISNEY PLUS ANNUAL',         amount: 139.99, category: 'Subscriptions & Streaming', paymentMethod: 'ANZ Amex', notes: 'Annual plan' },

  // Fuel
  { id: 'exp_f01', date: d(-6),  description: 'BP CONNECT ROSEHILL',        amount: 92.40,  category: 'Fuel',                   paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_f02', date: d(-20), description: 'AMPOL PARRAMATTA',           amount: 86.20,  category: 'Fuel',                   paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_f03', date: d(-45), description: 'SHELL SEVEN HILLS',          amount: 95.80,  category: 'Fuel',                   paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_f04', date: d(-70), description: 'BP CONNECT ROSEHILL',        amount: 88.60,  category: 'Fuel',                   paymentMethod: 'CommBank Everyday', notes: '' },

  // Transport
  { id: 'exp_t01', date: d(-3),  description: 'OPAL TOP UP PARRAMATTA',     amount: 50.00,  category: 'Transport',              paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_t02', date: d(-18), description: 'UBER TRIP SYDNEY CBD',       amount: 24.80,  category: 'Transport',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_t03', date: d(-33), description: 'OPAL TOP UP PARRAMATTA',     amount: 50.00,  category: 'Transport',              paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_t04', date: d(-55), description: 'LINKT TOLL ACCOUNT',         amount: 35.20,  category: 'Transport',              paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_t05', date: d(-80), description: 'UBER TRIP PARRAMATTA',       amount: 18.50,  category: 'Transport',              paymentMethod: 'ANZ Amex', notes: '' },

  // Health & Medical
  { id: 'exp_h01', date: d(-10), description: 'CHEMIST WAREHOUSE PARRAMATTA', amount: 48.90, category: 'Health & Medical',     paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_h02', date: d(-38), description: 'GP MEDICAL CENTRE',           amount: 0,     category: 'Health & Medical',      paymentMethod: 'CommBank Everyday', notes: 'Bulk billed' },
  { id: 'exp_h03', date: d(-52), description: 'CHEMIST WAREHOUSE NORWEST',   amount: 62.40, category: 'Health & Medical',      paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_h04', date: d(-74), description: 'DENTAL CARE PARRAMATTA',      amount: 180.00, category: 'Health & Medical',    paymentMethod: 'ANZ Amex', notes: 'Check-up + clean' },

  // Gym & Fitness
  { id: 'exp_gm1', date: d(-1),  description: 'ANYTIME FITNESS PARRAMATTA',  amount: 49.95, category: 'Gym & Fitness',         paymentMethod: 'ANZ Amex', notes: 'Monthly membership' },
  { id: 'exp_gm2', date: d(-31), description: 'ANYTIME FITNESS PARRAMATTA',  amount: 49.95, category: 'Gym & Fitness',         paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_gm3', date: d(-61), description: 'ANYTIME FITNESS PARRAMATTA',  amount: 49.95, category: 'Gym & Fitness',         paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_gm4', date: d(-25), description: 'NBC BADMINTON SEVEN HILLS',   amount: 18.00, category: 'Gym & Fitness',         paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_gm5', date: d(-58), description: 'NBC BADMINTON SEVEN HILLS',   amount: 18.00, category: 'Gym & Fitness',         paymentMethod: 'CommBank Everyday', notes: '' },

  // Home & Garden
  { id: 'exp_hm1', date: d(-44), description: 'BUNNINGS WAREHOUSE RYDALMERE', amount: 124.60, category: 'Home & Garden',      paymentMethod: 'CommBank Everyday', notes: 'Garden tools' },
  { id: 'exp_hm2', date: d(-82), description: 'IKEA TEMPE',                   amount: 289.00, category: 'Home & Garden',      paymentMethod: 'ANZ Amex', notes: 'Storage & shelving' },
  { id: 'exp_hm3', date: d(-16), description: 'PARRAMATTA LAUNDRETTE',         amount: 24.00, category: 'Home & Garden',       paymentMethod: 'CommBank Everyday', notes: '' },

  // Insurance
  { id: 'exp_in1', date: d(-15), description: 'NRMA COMPREHENSIVE CAR INS',  amount: 182.40, category: 'Insurance',           paymentMethod: 'ANZ Amex', notes: 'Monthly premium' },
  { id: 'exp_in2', date: d(-45), description: 'NRMA COMPREHENSIVE CAR INS',  amount: 182.40, category: 'Insurance',           paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_in3', date: d(-75), description: 'MEDIBANK PRIVATE HEALTH',      amount: 248.60, category: 'Insurance',          paymentMethod: 'ANZ Amex', notes: 'Couples cover' },

  // Internet & Phone
  { id: 'exp_ip1', date: d(-8),  description: 'AUSSIE BROADBAND MONTHLY',    amount: 79.00,  category: 'Internet & Phone',    paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_ip2', date: d(-38), description: 'AUSSIE BROADBAND MONTHLY',    amount: 79.00,  category: 'Internet & Phone',    paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_ip3', date: d(-68), description: 'AUSSIE BROADBAND MONTHLY',    amount: 79.00,  category: 'Internet & Phone',    paymentMethod: 'ANZ Amex', notes: '' },
  { id: 'exp_ip4', date: d(-8),  description: 'OPTUS MOBILE PLAN',           amount: 49.00,  category: 'Internet & Phone',    paymentMethod: 'CommBank Everyday', notes: '' },
  { id: 'exp_ip5', date: d(-38), description: 'OPTUS MOBILE PLAN',           amount: 49.00,  category: 'Internet & Phone',    paymentMethod: 'CommBank Everyday', notes: '' },

  // Entertainment
  { id: 'exp_en1', date: d(-42), description: 'JB HI-FI PARRAMATTA',         amount: 89.00,  category: 'Entertainment',       paymentMethod: 'ANZ Amex', notes: 'Headphones' },
  { id: 'exp_en2', date: d(-88), description: 'DYMOCKS MACQUARIE',            amount: 34.99,  category: 'Entertainment',       paymentMethod: 'CommBank Everyday', notes: '' },
];

// ── BUDGETS ──────────────────────────────────────────────────
export const SAMPLE_BUDGETS = {
  'Groceries':                 900,
  'Dining & Takeaway':         400,
  'Coffee & Drinks':           120,
  'Subscriptions & Streaming': 80,
  'Fuel':                      200,
  'Transport':                 150,
  'Health & Medical':          200,
  'Gym & Fitness':             130,
  'Home & Garden':             300,
  'Insurance':                 500,
  'Internet & Phone':          150,
  'Entertainment':             150,
  'Clothing & Apparel':        200,
  'Travel & Holidays':         500,
};

// ── SETTINGS ─────────────────────────────────────────────────
export const SAMPLE_SETTINGS = {
  currency:    'AUD',
  dateFormat:  'DD/MM/YYYY',
  theme:       'dark',
  chartsStyle: 'Professional',
  cards:       ['ANZ Amex', 'CommBank Everyday'],
  notifications: {
    enabled:      true,
    budgetAlerts: true,
    overspend:    true,
    investment:   true,
  },
};
