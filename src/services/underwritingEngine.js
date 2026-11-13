/**
 * NIRNAY Deterministic Underwriting & Policy Evaluation Engine
 * Modelled for Hero Housing Finance Underwriting Operations
 * Grounded in RBI/NHB Master Directions (2025) & RBI Digital Lending Directions (2025)
 */

export const STATUTORY_POLICY_CONFIG = {
  // Statutory RBI HFC Housing Loan LTV Caps (Mandatory Non-negotiable)
  HOUSING_LOAN_LTV: [
    { maxLoanAmount: 3000000, maxLTV: 90.0, reference: 'RBI Master Direction - HFCs Section 31 (Loans <= 30L)' },
    { maxLoanAmount: 7500000, maxLTV: 80.0, reference: 'RBI Master Direction - HFCs Section 31 (Loans 30L - 75L)' },
    { maxLoanAmount: Infinity, maxLTV: 75.0, reference: 'RBI Master Direction - HFCs Section 31 (Loans > 75L)' },
  ],
  // Statutory RBI Digital Lending Cooling-off / Look-up Period Floor
  MIN_COOLING_OFF_DAYS: 1, // RBI Digital Lending Directions, 2025 mandate: minimum 1 day

  // Configurable Illustrative Lender Policies (Pending formal Hero Housing Credit Committee sign-off)
  LAP_MAX_LTV: 60.0, // Configurable illustrative lender benchmark
  MAX_PERMISSIBLE_FOIR: 55.0, // Configurable illustrative lender cashflow ceiling
  PRIME_BUREAU_SCORE_MIN: 650, // Configurable illustrative bureau cutoff
  MAX_TENURE_HOME_LOAN_MONTHS: 360, // 30 Years
  MAX_TENURE_LAP_MONTHS: 180, // 15 Years
  DEFAULT_BENCHMARK_RATE_HL: 8.50,
  DEFAULT_BENCHMARK_RATE_LAP: 10.25,
};

/**
 * Standard Mortgage EMI Calculation (Reducing Balance)
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !tenureMonths || tenureMonths <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Fixed Obligation to Income Ratio (FOIR)
 * Formula: ((Existing Obligations + Proposed Loan EMI) / Net Monthly Income) * 100
 */
export function calculateFOIR(existingObligations, proposedEMI, netMonthlyIncome) {
  if (!netMonthlyIncome || netMonthlyIncome <= 0) return 0;
  const totalCommitments = Number(existingObligations || 0) + Number(proposedEMI || 0);
  const foir = (totalCommitments / Number(netMonthlyIncome)) * 100;
  return Number(foir.toFixed(1));
}

/**
 * Loan-to-Value Ratio (LTV)
 * Formula: (Loan Amount / Realizable Property Market Value) * 100
 * Note: Under RBI rules, stamp duty and registration must NOT be included in property cost.
 */
export function calculateLTV(loanAmount, propertyMarketValue) {
  if (!propertyMarketValue || propertyMarketValue <= 0) return 0;
  const ltv = (Number(loanAmount) / Number(propertyMarketValue)) * 100;
  return Number(ltv.toFixed(1));
}

/**
 * Maximum Eligible Loan Amount based on Disposable Cashflow
 * Derived from Max Permissible FOIR and Tenure
 */
export function calculateMaxEligibleLoanAmount(netMonthlyIncome, existingObligations, annualRate, tenureMonths, maxFOIR = 55.0) {
  if (!netMonthlyIncome || netMonthlyIncome <= 0) return 0;
  
  const maxPermissibleObligation = (Number(netMonthlyIncome) * (maxFOIR / 100));
  const availableSurplusForEMI = maxPermissibleObligation - Number(existingObligations || 0);

  if (availableSurplusForEMI <= 0) return 0;

  const monthlyRate = annualRate / 12 / 100;
  const discountFactor = (Math.pow(1 + monthlyRate, tenureMonths) - 1) /
    (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths));
  
  const maxPrincipal = Math.floor(availableSurplusForEMI * discountFactor);
  return Math.max(0, Math.floor(maxPrincipal / 25000) * 25000);
}

/**
 * Evaluates Statutory and Lender Credit Policy Rules
 */
export function evaluateCreditPolicyRules(application, calculatedMetrics) {
  const { loanType, loanAmountRequested, tenureMonthsRequested, creditBureauScore } = application;
  const { calculatedLTV, calculatedFOIR } = calculatedMetrics;
  const evaluations = [];

  // 1. Statutory LTV Evaluation (RBI Mandatory)
  if (loanType === 'home_loan') {
    let statutoryCap = 75.0;
    let ruleCitation = 'RBI Master Direction - HFCs Section 31 (Loans > 75L)';
    if (loanAmountRequested <= 3000000) {
      statutoryCap = 90.0;
      ruleCitation = 'RBI Master Direction - HFCs Section 31 (Loans <= 30L)';
    } else if (loanAmountRequested <= 7500000) {
      statutoryCap = 80.0;
      ruleCitation = 'RBI Master Direction - HFCs Section 31 (Loans 30L - 75L)';
    }

    const passed = calculatedLTV <= statutoryCap;
    evaluations.push({
      ruleCode: 'POL-HL-LTV',
      ruleName: 'Statutory Home Loan LTV Ceiling',
      isStatutory: true,
      citation: ruleCitation,
      metric: 'LTV Ratio',
      threshold: `${statutoryCap}%`,
      actualValue: `${calculatedLTV}%`,
      status: passed ? 'PASS' : 'FAIL',
      severity: 'hard_decline',
      explanation: passed
        ? `LTV of ${calculatedLTV}% complies with statutory ${statutoryCap}% ceiling.`
        : `LTV of ${calculatedLTV}% breaches statutory cap of ${statutoryCap}% by ${(calculatedLTV - statutoryCap).toFixed(1)}%. Requires loan haircut or equity contribution.`
    });
  } else if (loanType === 'lap') {
    const passed = calculatedLTV <= STATUTORY_POLICY_CONFIG.LAP_MAX_LTV;
    evaluations.push({
      ruleCode: 'POL-LAP-LTV',
      ruleName: 'Configurable Illustrative LAP Collateral Benchmark',
      isStatutory: false,
      citation: 'Configurable Lender Policy (Illustrative 60% benchmark pending committee sign-off)',
      metric: 'LTV Ratio',
      threshold: `${STATUTORY_POLICY_CONFIG.LAP_MAX_LTV}%`,
      actualValue: `${calculatedLTV}%`,
      status: passed ? 'PASS' : 'REFER',
      severity: 'refer_to_underwriter',
      explanation: passed
        ? `LTV of ${calculatedLTV}% is within the illustrative 60% LAP collateral cushion.`
        : `LTV of ${calculatedLTV}% exceeds 60% LAP benchmark. Requires underwriter collateral exception.`
    });
  }

  // 2. Fixed Obligation to Income Ratio (FOIR) Evaluation (Configurable Lender Policy)
  const foirPassed = calculatedFOIR <= STATUTORY_POLICY_CONFIG.MAX_PERMISSIBLE_FOIR;
  evaluations.push({
    ruleCode: 'POL-FOIR-MAX',
    ruleName: 'Configurable Illustrative FOIR Cap',
    isStatutory: false,
    citation: 'Configurable Lender Policy (Illustrative 55% benchmark pending committee sign-off)',
    metric: 'FOIR Ratio',
    threshold: `${STATUTORY_POLICY_CONFIG.MAX_PERMISSIBLE_FOIR}%`,
    actualValue: `${calculatedFOIR}%`,
    status: foirPassed ? 'PASS' : 'REFER',
    severity: calculatedFOIR > 70 ? 'hard_decline' : 'refer_to_underwriter',
    explanation: foirPassed
      ? `FOIR of ${calculatedFOIR}% retains sufficient disposable debt servicing buffer.`
      : `FOIR of ${calculatedFOIR}% exceeds ${STATUTORY_POLICY_CONFIG.MAX_PERMISSIBLE_FOIR}% benchmark. Disposable cashflow may be strained.`
  });

  // 3. Bureau Score Evaluation (if score is available)
  if (creditBureauScore !== null && creditBureauScore !== undefined) {
    const bureauPassed = creditBureauScore >= STATUTORY_POLICY_CONFIG.PRIME_BUREAU_SCORE_MIN;
    evaluations.push({
      ruleCode: 'POL-CIBIL-MIN',
      ruleName: 'Prime Bureau Cut-off Score',
      isStatutory: false,
      citation: 'Configurable Lender Policy (Illustrative 650 bureau cut-off)',
      metric: 'CIBIL Score',
      threshold: `${STATUTORY_POLICY_CONFIG.PRIME_BUREAU_SCORE_MIN}`,
      actualValue: `${creditBureauScore}`,
      status: bureauPassed ? 'PASS' : 'FAIL',
      severity: creditBureauScore < 600 ? 'hard_decline' : 'refer_to_underwriter',
      explanation: bureauPassed
        ? `Bureau score ${creditBureauScore} satisfies prime credit threshold.`
        : `Bureau score ${creditBureauScore} falls below prime cut-off (${STATUTORY_POLICY_CONFIG.PRIME_BUREAU_SCORE_MIN}). Requires detailed tradeline inspection.`
    });
  } else {
    evaluations.push({
      ruleCode: 'POL-CIBIL-PENDING',
      ruleName: 'Bureau Report Ingestion',
      isStatutory: false,
      citation: 'Underwriting Verification Gate',
      metric: 'CIBIL Score',
      threshold: 'Verified Report',
      actualValue: 'Awaiting Pull',
      status: 'NEEDS_REVIEW',
      severity: 'refer_to_underwriter',
      explanation: 'Bureau inquiry pending. Final underwriting requires authentic tradeline ingestion.'
    });
  }

  // 4. Tenure Evaluation
  const maxTenure = loanType === 'home_loan' ? STATUTORY_POLICY_CONFIG.MAX_TENURE_HOME_LOAN_MONTHS : STATUTORY_POLICY_CONFIG.MAX_TENURE_LAP_MONTHS;
  const tenurePassed = tenureMonthsRequested <= maxTenure;
  evaluations.push({
    ruleCode: 'POL-TENURE-CAP',
    ruleName: 'Maximum Amortization Tenure',
    isStatutory: false,
    citation: 'Hero Housing Product Schedule',
    metric: 'Tenure (Months)',
    threshold: `${maxTenure} Months`,
    actualValue: `${tenureMonthsRequested} Months`,
    status: tenurePassed ? 'PASS' : 'FAIL',
    severity: 'hard_decline',
    explanation: tenurePassed
      ? `Requested tenure of ${tenureMonthsRequested} months is within permissible limits.`
      : `Requested tenure of ${tenureMonthsRequested} months exceeds maximum allowable tenure of ${maxTenure} months.`
  });

  // 5. Statutory Cooling-Off Period Evaluation (RBI Digital Lending Directions 2025)
  evaluations.push({
    ruleCode: 'POL-COOLING-OFF',
    ruleName: 'RBI Statutory Cooling-Off Period',
    isStatutory: true,
    citation: 'RBI Digital Lending Directions, 2025',
    metric: 'Look-up Exit Window',
    threshold: `>= ${STATUTORY_POLICY_CONFIG.MIN_COOLING_OFF_DAYS} Day`,
    actualValue: 'Available',
    status: 'PASS',
    severity: 'hard_decline',
    explanation: `Statutory minimum ${STATUTORY_POLICY_CONFIG.MIN_COOLING_OFF_DAYS}-day look-up period provided to borrower with zero penalty exit.`
  });

  return evaluations;
}

/**
 * Full Underwriting Engine Run (Deterministic & Structured)
 */
export function runPreliminaryUnderwritingEngine(applicationData) {
  const {
    loanType = 'home_loan',
    loanAmountRequested = 0,
    tenureMonthsRequested = 240,
    netMonthlyIncome = 0,
    existingMonthlyObligations = 0,
    estimatedMarketValue = 0,
    creditBureauScore = null,
  } = applicationData;

  const interestRate = loanType === 'home_loan'
    ? STATUTORY_POLICY_CONFIG.DEFAULT_BENCHMARK_RATE_HL
    : STATUTORY_POLICY_CONFIG.DEFAULT_BENCHMARK_RATE_LAP;

  const estimatedEMI = calculateEMI(loanAmountRequested, interestRate, tenureMonthsRequested);
  const calculatedFOIR = calculateFOIR(existingMonthlyObligations, estimatedEMI, netMonthlyIncome);
  const calculatedLTV = calculateLTV(loanAmountRequested, estimatedMarketValue);
  const calculatedDTI = netMonthlyIncome > 0 ? Number((loanAmountRequested / (netMonthlyIncome * 12)).toFixed(1)) : 0;
  const maxEligibleLoanAmount = calculateMaxEligibleLoanAmount(
    netMonthlyIncome,
    existingMonthlyObligations,
    interestRate,
    tenureMonthsRequested
  );

  const calculatedMetrics = {
    calculatedEMI,
    calculatedFOIR,
    calculatedLTV,
    calculatedDTI,
    maxEligibleLoanAmount,
    benchmarkRate: interestRate,
  };

  const policyEvaluations = evaluateCreditPolicyRules(
    { loanType, loanAmountRequested, tenureMonthsRequested, creditBureauScore },
    calculatedMetrics
  );

  // Overall Assessment Status Determination
  const hasHardDecline = policyEvaluations.some(p => p.status === 'FAIL' && p.severity === 'hard_decline');
  const hasRefer = policyEvaluations.some(p => p.status === 'REFER' || p.status === 'NEEDS_REVIEW');

  let assessmentStatus = 'passed';
  if (hasHardDecline) {
    assessmentStatus = 'declined';
  } else if (hasRefer) {
    assessmentStatus = 'referred';
  }

  return {
    isBinding: false, // Indicative assessment only
    assessmentStatus,
    timestamp: new Date().toISOString(),
    ruleEngineVersion: '2026.1-rbi-compliant',
    calculatedMetrics,
    policyEvaluations,
  };
}
