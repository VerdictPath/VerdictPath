// Canonical coin rewards for litigation stages and substages
// These values are the single source of truth and MUST NOT be supplied by clients

const STAGE_COINS = {
  1: 100,  // Pre-Litigation
  2: 32,   // Complaint Filed
  3: 50,   // Discovery
  4: 25,   // Mediation
  5: 40,   // Pre-Trial
  6: 60,   // Trial
  7: 50,   // Verdict
  8: 30,   // Appeal
  9: 75    // Case Resolution
};

const SUBSTAGE_COINS = {
  // Pre-Litigation (Stage 1)
  'pre-1': 10,   // Police Report
  'pre-2': 10,   // Body Cam Footage
  'pre-3': 10,   // Dash Cam Footage
  'pre-4': 5,    // Pictures
  'pre-5': 5,    // Health Insurance Card
  'pre-6': 5,    // Auto Insurance Company
  'pre-7': 5,    // Auto Insurance Policy Number
  'pre-8': 15,   // Medical Bills
  'pre-9': 35,   // Medical Records
  'pre-10': 15,  // Demand Sent
  'pre-11': 10,  // Demand Rejected
  
  // Complaint Filed (Stage 2)
  'cf-1': 8,     // Draft Complaint
  'cf-2': 10,    // File with Court
  'cf-3': 7,     // Serve Defendant
  'cf-4': 7,     // Answer Filed
  
  // Discovery (Stage 3)
  'disc-1': 10,  // Interrogatories
  'disc-2': 10,  // Request for Production
  'disc-3': 10,  // Depositions
  'disc-4': 10,  // Request for Admissions
  'disc-5': 10,  // Expert Disclosures
  
  // Mediation (Stage 4)
  'med-1': 8,    // Mediation Scheduled
  'med-2': 10,   // Attend Mediation
  'med-3': 7,    // Outcome Documented
  
  // Deposition (Stage 5)
  'dep-1': 25,   // Deposition Preparation
  'dep-2': 25,   // Your Deposition
  'dep-3': 25,   // Opposing Party Deposition
  'dep-4': 25,   // Expert Deposition
  
  // Trial Preparation (Stage 6)
  'tp-1': 25,    // Prepare your Testimony
  'tp-2': 20,    // Confirm Exhibits and Evidence
  'tp-3': 15,    // Arrange to miss work
  'tp-4': 15,    // Arrange Transportation
  'tp-5': 25,    // Discuss Trial Strategy
  
  // Trial (Stage 7)
  'trial-1': 10,    // PreTrial motions
  'trial-2': 10,    // Jury selection / voir dire
  'trial-3': 15,    // Opening statements
  'trial-4': 15,    // Plaintiff's witness testimony
  'trial-5': 15,    // Plaintiff's evidence
  'trial-6': 5,     // Plaintiff rests
  'trial-7': 5,     // Motions
  'trial-8': 15,    // Defense's witness testimony
  'trial-9': 15,    // Defense's evidence
  'trial-10': 5,    // Defense rests
  'trial-11': 5,    // Motions
  'trial-12': 15,   // Closing arguments
  'trial-13': 10,   // Jury instructions
  'trial-14': 10,   // Jury deliberations
  'trial-15': 5,    // Jury questions
  'trial-16': 20,   // Verdict
  
  // Settlement (Stage 8)
  'settle-1': 10,   // Negotiations
  'settle-2': 10,   // Agreement to settle
  'settle-3': 8,    // Settlement release
  'settle-4': 7,    // Lien affidavit
  'settle-5': 8,    // Settlement statement
  'settle-6': 7,    // Disbursement to attorney
  'settle-7': 7,    // Attorney fees/costs/case expenses disbursed
  'settle-8': 7,    // Medical provider payments
  'settle-9': 6,    // Funding payments
  'settle-10': 15,  // Client disbursement
  
  // Case Resolution (Stage 9)
  'cr-1': 100,      // Judgment Entry
  'cr-2': 100       // Case Closure
};

// Get canonical coins for a stage
function getStageCoins(stageId) {
  const coins = STAGE_COINS[stageId];
  if (coins === undefined) {
    return 0;
  }
  return coins;
}

// Get canonical coins for a substage
function getSubstageCoins(substageId) {
  const coins = SUBSTAGE_COINS[substageId];
  if (coins === undefined) {
    return 0;
  }
  return coins;
}

module.exports = {
  STAGE_COINS,
  SUBSTAGE_COINS,
  getStageCoins,
  getSubstageCoins
};
