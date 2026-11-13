/**
 * NIRNAY Realistic Mock Data
 * Modelled for Hero Housing Finance Underwriting Operations
 */

export const INITIAL_APPLICATIONS = [
  {
    id: 'APP-2026-0814',
    loanType: 'home_loan',
    loanTypeLabel: 'Home Loan (Purchase)',
    applicantName: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '+91 98201 44521',
    dob: '1989-06-14',
    panNumber: 'ABCDE1234F',
    gender: 'Male',
    maritalStatus: 'Married',
    currentAddress: 'A-402, Green Acres, Powai, Mumbai, MH - 400076',
    
    // Employment & Financials
    employmentType: 'salaried',
    employmentTypeLabel: 'Salaried Professional',
    employerName: 'Infosys Technologies Ltd.',
    designation: 'Senior Lead Architect',
    yearsInJob: 6,
    grossMonthlyIncome: 145000,
    netMonthlyIncome: 125000,
    existingMonthlyObligations: 12000, // e.g. Car loan EMI
    liquidAssets: 850000,
    primaryBank: 'HDFC Bank Ltd.',
    
    // Property Collateral
    propertyType: 'Ready Built Apartment',
    propertyAddress: 'Flat 1104, Tower B, Blue Horizon, Thane West, MH - 400607',
    carpetAreaSqft: 980,
    estimatedMarketValue: 6250000,
    propertyTitleStatus: 'Freehold (Clear Title)',
    
    // Loan Request
    loanAmountRequested: 4500000,
    tenureMonthsRequested: 240, // 20 years
    benchmarkRate: 8.50, // 8.50% p.a.
    
    // Calculated Underwriting Ratios
    calculatedFOIR: 37.6, // (12000 + 35000) / 125000
    calculatedLTV: 72.0,  // 45L / 62.5L
    calculatedDTI: 2.8,   // Debt to annual income
    maxEligibleLoanAmount: 5200000,
    estimatedMonthlyEMI: 39053,
    
    // AI Risk Engine
    creditBureauScore: 782,
    probabilityOfDefault: 0.042,
    numericalRiskScore: 86,
    riskCategory: 'low',
    riskDrivers: [
      { factor: 'Bureau Score 782 (Prime Tier)', impact: 'positive', value: '+18 pts' },
      { factor: 'Conservative FOIR (37.6% vs 55% cap)', impact: 'positive', value: '+14 pts' },
      { factor: 'Strong Employment Vintage (6 yrs)', impact: 'positive', value: '+8 pts' },
      { factor: 'LTV Margin Buffer (28% equity)', impact: 'positive', value: '+6 pts' }
    ],
    
    // External Integrations (Simulated)
    externalData: {
      digilocker: { status: 'Verified', timestamp: '2026-11-10T10:14:00Z', reference: 'DL-98231-MH' },
      panVerification: { status: 'Verified', nsdlMatch: '100% Name Match', active: true },
      creditBureau: { provider: 'CIBIL', score: 782, activeTradelines: 2, overdueDays: 0, checkedAt: '2026-11-10T10:15:30Z' },
      bankStatement: { provider: 'Account Aggregator (Mock)', verifiedAvgBalance: 142000, salaryCreditsDetected: 6, inwardBounces: 0 },
      landRegistry: { status: 'Clean Title (No Encumbrance)', subRegistrar: 'Thane District' },
      amlScreening: { status: 'Cleared', pepMatch: false, sanctionsListHit: false }
    },
    
    // Document Dossier
    documents: [
      { id: 'doc-1', type: 'PAN Card', fileName: 'pan_card_mehta.pdf', status: 'verified', extracted: { name: 'Aarav Mehta', pan: 'ABCDE1234F', dob: '14/06/1989' }, remarks: 'Name and DOB match DigiLocker exactly.' },
      { id: 'doc-2', type: 'Salary Slips (3 Mos)', fileName: 'salary_slips_q3.pdf', status: 'verified', extracted: { employer: 'Infosys Technologies', avgNetSalary: '₹1,25,000' }, remarks: 'Direct salary credit verified in bank statement.' },
      { id: 'doc-3', type: 'Bank Statement (6 Mos)', fileName: 'hdfc_statement_6m.pdf', status: 'verified', extracted: { avgMonthlyBalance: '₹1,42,000', bounceCount: 0 }, remarks: 'Consistent inflows, healthy liquidity.' },
      { id: 'doc-4', type: 'Property Title Deed', fileName: 'title_deed_thane.pdf', status: 'verified', extracted: { surveyNo: '142/3A', owner: 'Aarav Mehta (Agreement)' }, remarks: 'Registered sale agreement verified.' }
    ],
    
    // Compliance Verification
    complianceChecks: [
      { code: 'NHB-LTV-01', rule: 'NHB Maximum LTV Cap (≤ 80% for loans up to ₹75L)', status: 'PASS', details: 'Applicant LTV is 72.0%.' },
      { code: 'RBI-FPC-02', rule: 'RBI Fair Practices - Transparent Key Fact Statement (KFS)', status: 'PASS', details: 'Full schedule & APR disclosed to borrower.' },
      { code: 'KYC-AML-03', rule: 'PMLA & AML Watchlist Clearance', status: 'PASS', details: 'No adverse PEP or OFAC match.' },
      { code: 'DPDP-ACT-04', rule: 'Explicit Digital Consent & Non-Repudiation', status: 'PASS', details: 'Consent recorded with IP & timestamp.' }
    ],
    
    // Fraud Alerts
    fraudAlerts: [],
    
    // Decision History
    status: 'approved',
    submissionDate: '2026-11-10T10:12:00Z',
    finalDecision: {
      outcome: 'APPROVE',
      decisionType: 'Automated Engine',
      sanctionedAmount: 4500000,
      sanctionedRate: 8.50,
      sanctionedTenureMonths: 240,
      sanctionedEMI: 39053,
      decidedAt: '2026-11-10T10:18:22Z',
      reviewerName: 'NIRNAY Auto-Sanction Engine',
      remarks: 'Application satisfies all primary credit and underwriting benchmarks. Automated sanction issued.'
    },
    timeline: [
      { date: '10 Nov 2026, 10:12 AM', title: 'Application Submitted', desc: 'Customer completed intake form and uploaded 4 documents with consent.' },
      { date: '10 Nov 2026, 10:15 AM', title: 'External Checks Completed', desc: 'CIBIL Bureau, DigiLocker, and AML screening returned verified.' },
      { date: '10 Nov 2026, 10:16 AM', title: 'Automated Underwriting Engine Run', desc: 'FOIR 37.6%, LTV 72.0%, ML Risk Score 86/100 (Low Risk).' },
      { date: '10 Nov 2026, 10:18 AM', title: 'Loan Sanctioned', desc: 'Automated approval generated with formal Sanction Letter ready.' }
    ]
  },
  {
    id: 'APP-2026-0921',
    loanType: 'lap',
    loanTypeLabel: 'Loan Against Property (LAP)',
    applicantName: 'Priya Nair',
    email: 'priya.nair@nairassociates.in',
    phone: '+91 94471 28910',
    dob: '1985-11-28',
    panNumber: 'PRYPN9821K',
    gender: 'Female',
    maritalStatus: 'Single',
    currentAddress: 'Flat 301, Palm Grove, Indiranagar, Bengaluru, KA - 560038',
    
    // Employment & Financials
    employmentType: 'self_employed',
    employmentTypeLabel: 'Self-Employed Professional (Architect)',
    employerName: 'Nair Architecture & Design Studio',
    designation: 'Principal Architect & Proprietor',
    yearsInJob: 8,
    grossMonthlyIncome: 110000,
    netMonthlyIncome: 92000,
    existingMonthlyObligations: 18500, // Business equipment loan
    liquidAssets: 420000,
    primaryBank: 'State Bank of India',
    
    // Property Collateral
    propertyType: 'Self-Owned Commercial / Residential Unit',
    propertyAddress: 'No. 44, 2nd Cross, HAL 2nd Stage, Indiranagar, Bengaluru, KA - 560008',
    carpetAreaSqft: 1250,
    estimatedMarketValue: 5400000,
    propertyTitleStatus: 'Freehold (Ancestral Transfer)',
    
    // Loan Request
    loanAmountRequested: 2800000,
    tenureMonthsRequested: 180, // 15 years
    benchmarkRate: 10.25, // 10.25% p.a. for LAP
    
    // Calculated Underwriting Ratios
    calculatedFOIR: 53.4, // (18500 + 30600) / 92000 - Borderline for LAP
    calculatedLTV: 51.8,  // 28L / 54L - Well within 60% LAP cap
    calculatedDTI: 3.2,
    maxEligibleLoanAmount: 2650000,
    estimatedMonthlyEMI: 30540,
    
    // AI Risk Engine
    creditBureauScore: 698,
    probabilityOfDefault: 0.135,
    numericalRiskScore: 64,
    riskCategory: 'medium',
    riskDrivers: [
      { factor: 'LTV Well Within Limit (51.8% vs 60% LAP Cap)', impact: 'positive', value: '+12 pts' },
      { factor: 'Established Business Vintage (8 Years)', impact: 'positive', value: '+10 pts' },
      { factor: 'Elevated FOIR (53.4% exceeds 50% LAP threshold)', impact: 'negative', value: '-16 pts' },
      { factor: 'Credit Bureau Score in Moderate Band (698)', impact: 'negative', value: '-8 pts' }
    ],
    
    // External Integrations
    externalData: {
      digilocker: { status: 'Verified', timestamp: '2026-11-11T14:20:00Z', reference: 'DL-44102-KA' },
      panVerification: { status: 'Verified', nsdlMatch: '100% Name Match', active: true },
      creditBureau: { provider: 'CIBIL', score: 698, activeTradelines: 3, overdueDays: 0, checkedAt: '2026-11-11T14:22:10Z' },
      bankStatement: { provider: 'Account Aggregator (Mock)', verifiedAvgBalance: 78000, salaryCreditsDetected: 0, inwardBounces: 1 },
      landRegistry: { status: 'Encumbrance Certificate Clear, but Mutation pending', subRegistrar: 'Shivajinagar, Bengaluru' },
      amlScreening: { status: 'Cleared', pepMatch: false, sanctionsListHit: false }
    },
    
    // Document Dossier
    documents: [
      { id: 'doc-1', type: 'PAN Card', fileName: 'pan_priya_nair.pdf', status: 'verified', extracted: { name: 'Priya Nair', pan: 'PRYPN9821K', dob: '28/11/1985' }, remarks: 'KYC verified.' },
      { id: 'doc-2', type: 'ITR & P&L Statements (2 Yrs)', fileName: 'itr_ay2025_26.pdf', status: 'verified', extracted: { annualGross: '₹13,20,000', taxPaid: '₹1,45,000' }, remarks: 'ITR acknowledgements verified against portal.' },
      { id: 'doc-3', type: 'Current Account Statement (12 Mos)', fileName: 'sbi_statement_12m.pdf', status: 'verified', extracted: { avgQuarterlyBalance: '₹84,000', bounceCount: 1 }, remarks: '1 technical clearing bounce noted in March 2026.' },
      { id: 'doc-4', type: 'Property Title & Mutation Extract', fileName: 'property_khata_extract.pdf', status: 'manual_review', extracted: { propertyId: 'PID-88219-IND', khataType: 'B-Khata noted' }, remarks: 'Khata extract mentions pending municipal regularisation. Requires underwriter legal inspection.' }
    ],
    
    // Compliance Verification
    complianceChecks: [
      { code: 'NHB-LAP-01', rule: 'NHB Collateral LTV Cap for LAP (≤ 60%)', status: 'PASS', details: 'Applicant LTV is 51.8%.' },
      { code: 'POL-FOIR-LAP', rule: 'Internal LAP FOIR Benchmark (≤ 50%)', status: 'FAIL', details: 'Calculated FOIR is 53.4%, exceeding benchmark by 3.4%.' },
      { code: 'DOC-TITLE-03', rule: 'Clean Registered A-Khata Title Requirement', status: 'requires_waiver', details: 'B-Khata extract flagged for legal opinion.' }
    ],
    
    // Fraud Alerts
    fraudAlerts: [
      { code: 'ALT-DOC-02', category: 'collateral', severity: 'medium', details: 'Property document mentions pending municipal mutation extract. Legal clarification required.', resolved: false }
    ],
    
    // Decision History
    status: 'under_review',
    submissionDate: '2026-11-11T14:18:00Z',
    finalDecision: {
      outcome: 'REFER',
      decisionType: 'Underwriter Queue',
      sanctionedAmount: null,
      sanctionedRate: null,
      sanctionedTenureMonths: null,
      sanctionedEMI: null,
      decidedAt: null,
      reviewerName: 'Pending Underwriter Review',
      remarks: 'Referred due to borderline FOIR (53.4%) and pending property title legal clarification.'
    },
    timeline: [
      { date: '11 Nov 2026, 02:18 PM', title: 'Application Submitted', desc: 'Customer submitted LAP application for ₹28.00 Lakhs.' },
      { date: '11 Nov 2026, 02:22 PM', title: 'Automated Pre-Screening Run', desc: 'FOIR calculated at 53.4%, CIBIL 698.' },
      { date: '11 Nov 2026, 02:23 PM', title: 'Referred to Underwriting Desk', desc: 'Flagged for Human Underwriter Review due to Khata status & FOIR.' }
    ]
  },
  {
    id: 'APP-2026-1045',
    loanType: 'home_loan',
    loanTypeLabel: 'Home Loan (Purchase)',
    applicantName: 'Vikramaditya Roy',
    email: 'v.roy@consultancycorp.org',
    phone: '+91 97118 63201',
    dob: '1992-03-22',
    panNumber: 'VKRPR4421M',
    gender: 'Male',
    maritalStatus: 'Single',
    currentAddress: 'Sector 62, Noida, UP - 201301',
    
    // Employment & Financials
    employmentType: 'salaried',
    employmentTypeLabel: 'Salaried Professional',
    employerName: 'Apex Strategic Consultants LLP',
    designation: 'Business Development Manager',
    yearsInJob: 1,
    grossMonthlyIncome: 180000,
    netMonthlyIncome: 155000, // Stated
    existingMonthlyObligations: 48000, // Multiple personal loans
    liquidAssets: 120000,
    primaryBank: 'ICICI Bank',
    
    // Property Collateral
    propertyType: 'Under Construction High-Rise',
    propertyAddress: 'Unit 1802, Grand Vista, Sector 150, Noida, UP - 201310',
    carpetAreaSqft: 1450,
    estimatedMarketValue: 8600000,
    propertyTitleStatus: 'Developer Allotment',
    
    // Loan Request
    loanAmountRequested: 7500000,
    tenureMonthsRequested: 240,
    benchmarkRate: 8.75,
    
    // Calculated Underwriting Ratios
    calculatedFOIR: 74.5, // Severe over-leverage
    calculatedLTV: 87.2,  // Exceeds 80% statutory cap for > ₹30L
    calculatedDTI: 5.6,
    maxEligibleLoanAmount: 4100000,
    estimatedMonthlyEMI: 66312,
    
    // AI Risk Engine
    creditBureauScore: 592,
    probabilityOfDefault: 0.384,
    numericalRiskScore: 36,
    riskCategory: 'high',
    riskDrivers: [
      { factor: 'Subprime Credit Score (592 with 60+ DPD defaults)', impact: 'negative', value: '-28 pts' },
      { factor: 'Excessive FOIR (74.5% vs 55% cap)', impact: 'negative', value: '-24 pts' },
      { factor: 'Statutory LTV Violation (87.2% vs 80% NHB cap)', impact: 'negative', value: '-20 pts' },
      { factor: 'Severe Income Discrepancy Detected (38.8% variance)', impact: 'negative', value: '-18 pts' }
    ],
    
    // External Integrations
    externalData: {
      digilocker: { status: 'Verified', timestamp: '2026-11-09T16:05:00Z', reference: 'DL-77312-UP' },
      panVerification: { status: 'Verified', nsdlMatch: '100% Match', active: true },
      creditBureau: { provider: 'CIBIL', score: 592, activeTradelines: 6, overdueDays: 68, checkedAt: '2026-11-09T16:08:00Z' },
      bankStatement: { provider: 'Account Aggregator (Mock)', verifiedAvgBalance: 24000, salaryCreditsDetected: 3, inwardBounces: 5 },
      landRegistry: { status: 'Project RERA registered but developer lien flagged', subRegistrar: 'Gautam Buddha Nagar' },
      amlScreening: { status: 'Cleared', pepMatch: false, sanctionsListHit: false }
    },
    
    // Documents
    documents: [
      { id: 'doc-1', type: 'PAN Card', fileName: 'pan_v_roy.pdf', status: 'verified', extracted: { name: 'Vikramaditya Roy', pan: 'VKRPR4421M' }, remarks: 'Valid.' },
      { id: 'doc-2', type: 'Salary Slips (3 Mos)', fileName: 'apex_salary_slip.pdf', status: 'failed', extracted: { statedNet: '₹1,55,000', detectedFontInconsistency: true }, remarks: 'Document text shows tampering around Net Pay field.' },
      { id: 'doc-3', type: 'Bank Statement (6 Mos)', fileName: 'icici_statement.pdf', status: 'verified', extracted: { actualSalaryCredit: '₹95,000', bounceCount: 5 }, remarks: 'Actual salary credit is ₹95,000, conflicting with slip.' },
      { id: 'doc-4', type: 'Builder Allotment Letter', fileName: 'allotment_grand_vista.pdf', status: 'manual_review', extracted: { unitNo: '1802', basePrice: '₹75,00,000' }, remarks: 'Over-valuation suspected.' }
    ],
    
    // Compliance Verification
    complianceChecks: [
      { code: 'NHB-LTV-01', rule: 'NHB Maximum LTV Cap (≤ 80%)', status: 'FAIL', details: 'Requested LTV is 87.2%, violating statutory NHB limits.' },
      { code: 'POL-CIBIL-MIN', rule: 'Minimum Underwriting Bureau Score (≥ 650)', status: 'FAIL', details: 'Bureau score is 592 with 68 days past due.' },
      { code: 'POL-FOIR-MAX', rule: 'Maximum Permissible FOIR (≤ 55%)', status: 'FAIL', details: 'Calculated FOIR is 74.5%.' }
    ],
    
    // Fraud Alerts
    fraudAlerts: [
      { code: 'FRD-INCOME-INFLATION', category: 'income', severity: 'critical', details: 'Stated Net Income (₹1,55,000) is 63.2% higher than verified Bank Statement Salary Credits (₹95,000).', resolved: false },
      { code: 'FRD-BANK-BOUNCES', category: 'transaction', severity: 'high', details: '5 inward clearing bounces detected within the trailing 180 days.', resolved: false }
    ],
    
    // Decision History
    status: 'rejected',
    submissionDate: '2026-11-09T16:02:00Z',
    finalDecision: {
      outcome: 'REJECT',
      decisionType: 'Automated Credit Policy Engine',
      sanctionedAmount: 0,
      sanctionedRate: 0,
      sanctionedTenureMonths: 0,
      sanctionedEMI: 0,
      decidedAt: '2026-11-09T16:12:00Z',
      reviewerName: 'NIRNAY Policy Filter',
      remarks: 'Application rejected due to severe statutory LTV violation (87.2%), critical bureau default history (Score 592), and verified income inflation anomaly.'
    },
    timeline: [
      { date: '09 Nov 2026, 04:02 PM', title: 'Application Submitted', desc: 'Customer submitted Home Loan application for ₹75.00 Lakhs.' },
      { date: '09 Nov 2026, 04:08 PM', title: 'Bureau & Statement Analysis Run', desc: 'Score 592 returned with 68 DPD. Severe income variance flagged.' },
      { date: '09 Nov 2026, 04:12 PM', title: 'Automated Rejection Issued', desc: 'Application failed 3 hard credit policy filters.' }
    ]
  },
  {
    id: 'APP-2026-1102',
    loanType: 'home_loan',
    loanTypeLabel: 'Home Loan (Purchase)',
    applicantName: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@healthplus.org',
    phone: '+91 99302 78104',
    dob: '1991-09-05',
    panNumber: 'SNEHK5512B',
    gender: 'Female',
    maritalStatus: 'Married',
    currentAddress: 'Flat 203, Sahakar Nagar, Pune, MH - 411009',
    
    // Employment & Financials
    employmentType: 'salaried',
    employmentTypeLabel: 'Salaried Healthcare Professional',
    employerName: 'Apollo Hospitals Enterprise Ltd.',
    designation: 'Senior Clinical Pharmacist',
    yearsInJob: 4,
    grossMonthlyIncome: 95000,
    netMonthlyIncome: 82000,
    existingMonthlyObligations: 6500, // Two-wheeler & education loan
    liquidAssets: 550000,
    primaryBank: 'Bank of Baroda',
    
    // Property Collateral
    propertyType: 'Ready Built Apartment',
    propertyAddress: 'A-602, Vistara Heights, Baner-Balewadi Link Road, Pune, MH - 411045',
    carpetAreaSqft: 820,
    estimatedMarketValue: 5100000,
    propertyTitleStatus: 'Freehold (Direct Builder Sale)',
    
    // Loan Request
    loanAmountRequested: 3500000,
    tenureMonthsRequested: 240,
    benchmarkRate: 8.50,
    
    // Calculated Underwriting Ratios
    calculatedFOIR: 45.0, // (6500 + 30375) / 82000
    calculatedLTV: 68.6,  // 35L / 51L
    calculatedDTI: 3.1,
    maxEligibleLoanAmount: 4150000,
    estimatedMonthlyEMI: 30375,
    
    // AI Risk Engine
    creditBureauScore: 742,
    probabilityOfDefault: 0.068,
    numericalRiskScore: 78,
    riskCategory: 'low',
    riskDrivers: [
      { factor: 'Good Credit Score (742 with 0 DPD)', impact: 'positive', value: '+14 pts' },
      { factor: 'Safe LTV Buffer (68.6% vs 80% NHB Cap)', impact: 'positive', value: '+12 pts' },
      { factor: 'Controlled FOIR (45.0% vs 55% Limit)', impact: 'positive', value: '+8 pts' }
    ],
    
    // External Integrations
    externalData: {
      digilocker: { status: 'Verified', timestamp: '2026-11-12T09:30:00Z', reference: 'DL-99120-MH' },
      panVerification: { status: 'Verified', nsdlMatch: '100% Match', active: true },
      creditBureau: { provider: 'CIBIL', score: 742, activeTradelines: 2, overdueDays: 0, checkedAt: '2026-11-12T09:32:00Z' },
      bankStatement: { provider: 'Account Aggregator (Mock)', verifiedAvgBalance: 65000, salaryCreditsDetected: 6, inwardBounces: 0 },
      landRegistry: { status: 'Title & RERA verified', subRegistrar: 'Haveli, Pune' },
      amlScreening: { status: 'Cleared', pepMatch: false, sanctionsListHit: false }
    },
    
    // Documents
    documents: [
      { id: 'doc-1', type: 'PAN Card', fileName: 'pan_sneha_k.pdf', status: 'verified', extracted: { name: 'Sneha Kulkarni', pan: 'SNEHK5512B' }, remarks: 'Name and identity verified.' },
      { id: 'doc-2', type: 'Salary Slips (3 Mos)', fileName: 'apollo_payslips_q3.pdf', status: 'verified', extracted: { employer: 'Apollo Hospitals Ltd', netSalary: '₹82,000' }, remarks: 'Direct salary match.' },
      { id: 'doc-3', type: 'Bank Statement (6 Mos)', fileName: 'bob_statement_6m.pdf', status: 'verified', extracted: { avgMonthlyBalance: '₹65,000', bounceCount: 0 }, remarks: 'Clear statement.' },
      { id: 'doc-4', type: 'Property Agreement', fileName: 'baner_property_agreement.pdf', status: 'verified', extracted: { unitNo: 'A-602', area: '820 sqft' }, remarks: 'All clear.' }
    ],
    
    // Compliance Verification
    complianceChecks: [
      { code: 'NHB-LTV-01', rule: 'NHB Maximum LTV Cap (≤ 80%)', status: 'PASS', details: 'Applicant LTV is 68.6%.' },
      { code: 'RBI-FPC-02', rule: 'RBI Fair Practices Code Guidelines', status: 'PASS', details: 'Full schedule & APR disclosed to borrower.' },
      { code: 'KYC-AML-03', rule: 'PMLA & AML Sanctions Clearance', status: 'PASS', details: 'Cleared.' }
    ],
    
    // Fraud Alerts
    fraudAlerts: [],
    
    // Decision History
    status: 'under_review',
    submissionDate: '2026-11-12T09:28:00Z',
    finalDecision: {
      outcome: 'REFER',
      decisionType: 'Underwriter Review Queue',
      sanctionedAmount: null,
      sanctionedRate: null,
      sanctionedTenureMonths: null,
      sanctionedEMI: null,
      decidedAt: null,
      reviewerName: 'Assigned to Senior Underwriter',
      remarks: 'Application under final document check. Routine review in progress.'
    },
    timeline: [
      { date: '12 Nov 2026, 09:28 AM', title: 'Application Submitted', desc: 'Customer completed intake form with consent.' },
      { date: '12 Nov 2026, 09:32 AM', title: 'Automated Checks Completed', desc: 'CIBIL 742, LTV 68.6%, FOIR 45.0%. Clean profile.' },
      { date: '12 Nov 2026, 09:35 AM', title: 'Pending Underwriter Sign-off', desc: 'Awaiting final administrative sign-off.' }
    ]
  }
];

export const CREDIT_POLICY_RULES = [
  { code: 'POL-HL-LTV', name: 'Home Loan Statutory LTV Cap', type: 'home_loan', metric: 'LTV Ratio', operator: '≤', threshold: '80.0%', description: 'Statutory NHB regulatory ceiling for loans up to ₹75 Lakhs.' },
  { code: 'POL-LAP-LTV', name: 'LAP Collateral LTV Cap', type: 'lap', metric: 'LTV Ratio', operator: '≤', threshold: '60.0%', description: 'Internal Hero Housing Finance collateral protection limit for commercial/residential LAP.' },
  { code: 'POL-FOIR-MAX', name: 'Fixed Obligation to Income Cap', type: 'all', metric: 'FOIR', operator: '≤', threshold: '55.0%', description: 'Ensures borrower retains at least 45% disposable cashflow after debt commitments.' },
  { code: 'POL-CIBIL-MIN', name: 'Minimum Prime Bureau Score', type: 'all', metric: 'CIBIL Score', operator: '≥', threshold: '650', description: 'Threshold for automated evaluation; scores under 650 trigger manual review or decline.' },
  { code: 'POL-TENURE-HL', name: 'Maximum Permissible Tenure', type: 'home_loan', metric: 'Tenure (Months)', operator: '≤', threshold: '360 mos (30 yrs)', description: 'Maximum amortization period allowed.' },
  { code: 'POL-TENURE-LAP', name: 'Maximum LAP Amortization', type: 'lap', metric: 'Tenure (Months)', operator: '≤', threshold: '180 mos (15 yrs)', description: 'Amortization schedule for property collateralized loans.' }
];

export const MOCK_USER_PROFILES = {
  customer: {
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@healthplus.org',
    role: 'applicant',
    avatarInitials: 'SK',
    phone: '+91 99302 78104'
  },
  underwriter: {
    name: 'Ramesh Sundaram',
    email: 'r.sundaram@herohousing.in',
    role: 'bank_admin',
    avatarInitials: 'RS',
    designation: 'Senior Credit Underwriter — Western Zone'
  }
};

/**
 * Standard Mortgage Math Utility Functions
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const monthlyRate = annualRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi);
}

export function calculateFOIR(existingObligations, proposedEMI, netMonthlyIncome) {
  if (!netMonthlyIncome || netMonthlyIncome <= 0) return 0;
  const foir = ((Number(existingObligations || 0) + Number(proposedEMI || 0)) / Number(netMonthlyIncome)) * 100;
  return Number(foir.toFixed(1));
}

export function calculateLTV(loanAmount, propertyMarketValue) {
  if (!propertyMarketValue || propertyMarketValue <= 0) return 0;
  const ltv = (Number(loanAmount) / Number(propertyMarketValue)) * 100;
  return Number(ltv.toFixed(1));
}

export function formatINR(val) {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

