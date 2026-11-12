/**
 * Perguntas de segurança padrão da Microsoft (conta local do Windows), em português.
 * O usuário também pode escrever uma pergunta personalizada.
 */
export const MICROSOFT_QUESTIONS = [
  'Qual era o nome do seu primeiro animal de estimação?',
  'Qual é o nome da cidade onde você nasceu?',
  'Qual era o seu apelido de infância?',
  'Qual é o nome da cidade onde seus pais se conheceram?',
  'Qual é o primeiro nome do seu primo mais velho?',
  'Qual é o nome da primeira escola que você frequentou?',
];

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface Account {
  username: string;
  securityQuestions: string[];
  passwordChangeRequired: boolean;
  setupRequired: boolean;
}

export interface UserInfo {
  id: string;
  username: string;
  createdAt: string;
  you: boolean;
}

export interface Invite {
  code: string;
  expiresAt: string;
}

// ------------------------------------------------------------------ configurações e margens

export interface ExtraCost {
  description: string;
  amount: number;
}

export interface Settings {
  storeName: string;
  defaultExtraCosts: ExtraCost[];
}

export type MarginType = 'PROFIT' | 'SEASONAL' | 'ADDITIONAL';

export const MARGIN_TYPES: { key: MarginType; label: string; hint: string }[] = [
  { key: 'PROFIT', label: 'Lucro', hint: 'Entra em todo pacote.' },
  { key: 'SEASONAL', label: 'Sazonal', hint: 'Só entra em pacotes marcados como sazonais.' },
  { key: 'ADDITIONAL', label: 'Personalizada', hint: 'Taxa de cartão, imposto, comissão... Entra em todo pacote.' },
];

export interface Margin {
  id: string;
  name: string;
  type: MarginType;
  /** Pontos percentuais (20 = 20%). */
  percent: number;
  defaultSelected: boolean;
  description: string | null;
}

export interface AppliedMargin {
  marginId: string | null;
  name: string;
  type: MarginType;
  percent: number;
}

// ------------------------------------------------------------------ estoque

export const UNITS = [
  { key: 'g', label: 'g (gramas)' },
  { key: 'ml', label: 'ml (mililitros)' },
  { key: 'un', label: 'un (unidades)' },
  { key: 'kg', label: 'kg' },
  { key: 'l', label: 'l (litros)' },
  { key: 'm', label: 'm (metros)' },
  { key: 'cm', label: 'cm' },
];

export const CATEGORIES = ['Cera', 'Essência', 'Recipiente', 'Pavio', 'Adesivo', 'Corante', 'Embalagem', 'Decoração', 'Outro'];

export interface Material {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  minStock: number;
  note: string | null;
  stock: number;
  stockValue: number;
  avgUnitCost: number;
  lastUnitCost: number;
  lastPurchaseDate: string | null;
  totalPurchased: number;
  totalSpent: number;
  totalConsumed: number;
  lots: number;
  lowStock: boolean;
}

export interface MaterialRequest {
  name: string;
  unit: string;
  category: string | null;
  minStock: number;
  note: string | null;
}

export interface Purchase {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  date: string;
  quantity: number;
  totalPrice: number;
  unitCost: number;
  remaining: number;
  consumed: number;
  supplier: string | null;
  note: string | null;
}

export interface PurchaseRequest {
  materialId: string;
  date: string;
  quantity: number;
  totalPrice: number;
  supplier: string | null;
  note: string | null;
}

// ------------------------------------------------------------------ produção

export type ItemMode = 'PER_UNIT' | 'TOTAL';

export interface Allocation {
  lotId: string;
  quantity: number;
  unitCost: number;
  purchaseDate: string;
}

export interface BatchItemRequest {
  materialId: string;
  mode: ItemMode;
  amount: number;
}

export interface BatchRequest {
  name: string;
  date: string;
  quantity: number;
  seasonal: boolean;
  items: BatchItemRequest[];
  extraCosts: ExtraCost[];
  margins: AppliedMargin[];
  salePrice: number | null;
  note: string | null;
}

export interface BatchItem {
  materialId: string;
  materialName: string;
  unit: string;
  mode: ItemMode;
  perUnit: number;
  total: number;
  cost: number;
  costPerUnit: number;
  avgUnitCost: number;
  shortage: number;
  shortageCost: number;
  allocations: Allocation[];
}

export interface Batch {
  id: string | null;
  number: number;
  name: string;
  date: string;
  quantity: number;
  seasonal: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: BatchItem[];
  extraCosts: ExtraCost[];
  margins: AppliedMargin[];
  materialCost: number;
  materialCostPerUnit: number;
  extraCostPerUnit: number;
  unitCost: number;
  totalCost: number;
  basePercent: number;
  seasonalPercent: number;
  appliedPercent: number;
  priceNormal: number;
  priceSeasonal: number;
  suggestedPrice: number;
  salePrice: number;
  manualPrice: boolean;
  profitPerUnit: number;
  realMarginPercent: number;
  markupPercent: number;
  sold: number;
  available: number;
  hasShortage: boolean;
}

// ------------------------------------------------------------------ vendas

export type Payment = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'OUTRO';

export const PAYMENTS: { key: Payment; label: string }[] = [
  { key: 'PIX', label: 'Pix' },
  { key: 'DINHEIRO', label: 'Dinheiro' },
  { key: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { key: 'CARTAO_DEBITO', label: 'Cartão de débito' },
  { key: 'TRANSFERENCIA', label: 'Transferência' },
  { key: 'OUTRO', label: 'Outro' },
];

export interface SaleItemRequest {
  batchId: string;
  quantity: number;
  unitPrice: number;
}

export interface SaleRequest {
  date: string;
  customer: string;
  items: SaleItemRequest[];
  discount: number;
  payment: Payment;
  note: string | null;
}

export interface SaleItem {
  batchId: string;
  batchNumber: number;
  batchName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unitCost: number;
  cost: number;
}

export interface Sale {
  id: string;
  number: number;
  date: string;
  customer: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  cost: number;
  profit: number;
  payment: Payment;
  note: string | null;
  candles: number;
}

// ------------------------------------------------------------------ balanço

export interface MonthRow {
  month: string;
  revenue: number;
  cogs: number;
  profit: number;
  purchases: number;
  candlesSold: number;
  candlesProduced: number;
  productionCost: number;
}

export interface CustomerRow {
  customer: string;
  sales: number;
  candles: number;
  revenue: number;
  profit: number;
}

export interface BatchRow {
  id: string;
  number: number;
  name: string;
  seasonal: boolean;
  produced: number;
  soldInPeriod: number;
  available: number;
  unitCost: number;
  salePrice: number;
  revenue: number;
  cogs: number;
  profit: number;
}

export interface Balance {
  from: string | null;
  to: string | null;
  revenue: number;
  discounts: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  purchases: number;
  cashResult: number;
  productionCost: number;
  candlesProduced: number;
  candlesSold: number;
  salesCount: number;
  averageTicket: number;
  materialStockValue: number;
  lowStockCount: number;
  finishedCandles: number;
  finishedStockCost: number;
  finishedStockPotential: number;
  months: MonthRow[];
  customers: CustomerRow[];
  batches: BatchRow[];
}
