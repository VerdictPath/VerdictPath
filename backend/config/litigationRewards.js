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
  
  // Pre-Trial (Stage 5)
  'pt-1': 8,     // Pretrial Motions
  'pt-2': 10,    // Summary Judgment
  'pt-3': 7,     // Pretrial Conference
  'pt-4': 8,     // Jury Selection
  'pt-5': 7,     // Trial Brief
  
  // Trial (Stage 6)
  'tr-1': 12,    // Opening Statements
  'tr-2': 15,    // Evidence Presentation
  'tr-3': 10,    // Witness Testimony
  'tr-4': 13,    // Closing Arguments
  'tr-5': 10,    // Jury Instructions
  
  // Verdict (Stage 7)
  'ver-1': 15,   // Jury Deliberation
  'ver-2': 20,   // Verdict Rendered
  'ver-3': 15,   // Post-Trial Motions
  
  // Appeal (Stage 8)
  'app-1': 10,   // Notice of Appeal
  'app-2': 12,   // Brief Filing
  'app-3': 8,    // Oral Arguments
  
  // Case Resolution (Stage 9)
  'res-1': 20,   // Settlement Agreement
  'res-2': 25,   // Final Judgment
  'res-3': 30    // Case Closed
};

// Get canonical coins for a stage
function getStageCoins(stageId) {
  const coins = STAGE_COINS[stageId];
  if (coins === undefined) {
    console.warn(`Unknown stage ID: ${stageId}, defaulting to 0 coins`);
    return 0;
  }
  return coins;
}

// Get canonical coins for a substage
function getSubstageCoins(substageId) {
  const coins = SUBSTAGE_COINS[substageId];
  if (coins === undefined) {
    console.warn(`Unknown substage ID: ${substageId}, defaulting to 0 coins`);
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
