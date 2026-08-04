/** NIP codes for cash-out. A production app would read Acute's bank directory. */
export const BANKS = [
  { name: "Access Bank", code: "000014" },
  { name: "Fidelity Bank", code: "000007" },
  { name: "First Bank of Nigeria", code: "000016" },
  { name: "Guaranty Trust Bank", code: "000013" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Opay", code: "100004" },
  { name: "Providus Bank", code: "000023" },
  { name: "Stanbic IBTC Bank", code: "000012" },
  { name: "United Bank for Africa", code: "000004" },
  { name: "Zenith Bank", code: "000015" },
] as const;
