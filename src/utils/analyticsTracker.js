import { CASE_PHASES, PHASE_TRANSITION_TASKS, LITIGATION_STAGES } from '../constants/mockData';

/**
 * Analytics utility for tracking case phase progression
 * Provides functions for detecting current phase, tracking transitions, and generating analytics
 */

/**
 * Determines the current case phase based on completed substages
 * @param {Array} completedSubstages - Array of completed substage IDs
 * @returns {Object} Current phase object with id, name, color, icon, description
 */
export const getCurrentPhase = (completedSubstages = []) => {
  // Default to Pre-Litigation phase
  if (!completedSubstages || completedSubstages.length === 0) {
    return CASE_PHASES.PRE_LITIGATION;
  }

  // Check if trial phase transition task is completed
  if (completedSubstages.includes(PHASE_TRANSITION_TASKS.TRIAL_START)) {
    return CASE_PHASES.TRIAL;
  }

  // Check if litigation phase transition task is completed
  if (completedSubstages.includes(PHASE_TRANSITION_TASKS.LITIGATION_START)) {
    return CASE_PHASES.LITIGATION;
  }

  // Default to Pre-Litigation
  return CASE_PHASES.PRE_LITIGATION;
};

/**
 * Gets the phase for a specific stage
 * @param {number} stageId - The stage ID
 * @returns {Object} Phase object for this stage
 */
export const getPhaseForStage = (stageId) => {
  const stage = LITIGATION_STAGES.find(s => s.id === stageId);
  if (!stage || !stage.phase) {
    return CASE_PHASES.PRE_LITIGATION;
  }

  return Object.values(CASE_PHASES).find(phase => phase.id === stage.phase) || CASE_PHASES.PRE_LITIGATION;
};

/**
 * Checks if a substage completion triggers a phase transition
 * @param {string} substageId - The substage ID being completed
 * @returns {Object|null} New phase object if transition occurs, null otherwise
 */
export const checkPhaseTransition = (substageId) => {
  if (substageId === PHASE_TRANSITION_TASKS.LITIGATION_START) {
    return CASE_PHASES.LITIGATION;
  }
  
  if (substageId === PHASE_TRANSITION_TASKS.TRIAL_START) {
    return CASE_PHASES.TRIAL;
  }

  return null;
};

/**
 * Generates phase analytics for a list of users/clients
 * @param {Array} users - Array of user objects with completedSubstages array
 * @returns {Object} Analytics object with counts and percentages by phase
 */
export const generatePhaseAnalytics = (users = []) => {
  const analytics = {
    total: users.length,
    byPhase: {
      [CASE_PHASES.PRE_LITIGATION.id]: { count: 0, percentage: 0, users: [] },
      [CASE_PHASES.LITIGATION.id]: { count: 0, percentage: 0, users: [] },
      [CASE_PHASES.TRIAL.id]: { count: 0, percentage: 0, users: [] }
    }
  };

  users.forEach(user => {
    const currentPhase = getCurrentPhase(user.completedSubstages || []);
    analytics.byPhase[currentPhase.id].count++;
    analytics.byPhase[currentPhase.id].users.push(user);
  });

  // Calculate percentages
  Object.keys(analytics.byPhase).forEach(phaseId => {
    const count = analytics.byPhase[phaseId].count;
    analytics.byPhase[phaseId].percentage = analytics.total > 0 
      ? Math.round((count / analytics.total) * 100) 
      : 0;
  });

  return analytics;
};

/**
 * Gets progress information for a user within their current phase
 * @param {Array} completedSubstages - Array of completed substage IDs
 * @returns {Object} Progress object with current phase, completed stages in phase, total stages in phase
 */
export const getPhaseProgress = (completedSubstages = []) => {
  const currentPhase = getCurrentPhase(completedSubstages);
  
  // Get all stages in current phase
  const stagesInPhase = LITIGATION_STAGES.filter(stage => stage.phase === currentPhase.id);
  
  // Count completed stages in current phase
  const completedStagesInPhase = stagesInPhase.filter(stage => {
    const allSubstagesCompleted = stage.subStages.every(sub => 
      completedSubstages.includes(sub.id)
    );
    return allSubstagesCompleted;
  });

  return {
    currentPhase,
    completedStages: completedStagesInPhase.length,
    totalStages: stagesInPhase.length,
    percentage: stagesInPhase.length > 0 
      ? Math.round((completedStagesInPhase.length / stagesInPhase.length) * 100)
      : 0,
    stageNames: stagesInPhase.map(s => s.name)
  };
};

/**
 * Gets celebration message for phase transitions
 * @param {Object} newPhase - The new phase object
 * @returns {string} Celebration message
 */
export const getPhaseCelebrationMessage = (newPhase) => {
  const messages = {
    [CASE_PHASES.LITIGATION.id]: "🎉 Milestone Reached!\n\nYour case has entered the Litigation Phase! You've completed initial preparation and your complaint is filed. The legal process is now in motion.",
    [CASE_PHASES.TRIAL.id]: "🎊 Major Milestone!\n\nYour case has advanced to the Trial Phase! You're in the final stages of your legal journey. Stay focused and keep moving forward!"
  };

  return messages[newPhase.id] || `Congratulations! You've entered the ${newPhase.name} phase!`;
};

/**
 * Calculates average progress by phase across multiple users
 * @param {Array} users - Array of user objects
 * @returns {Object} Average progress percentage for each phase
 */
export const calculateAverageProgressByPhase = (users = []) => {
  const phaseProgress = {
    [CASE_PHASES.PRE_LITIGATION.id]: { total: 0, count: 0, average: 0 },
    [CASE_PHASES.LITIGATION.id]: { total: 0, count: 0, average: 0 },
    [CASE_PHASES.TRIAL.id]: { total: 0, count: 0, average: 0 }
  };

  users.forEach(user => {
    const progress = getPhaseProgress(user.completedSubstages || []);
    phaseProgress[progress.currentPhase.id].total += progress.percentage;
    phaseProgress[progress.currentPhase.id].count++;
  });

  // Calculate averages
  Object.keys(phaseProgress).forEach(phaseId => {
    const data = phaseProgress[phaseId];
    phaseProgress[phaseId].average = data.count > 0 
      ? Math.round(data.total / data.count)
      : 0;
  });

  return phaseProgress;
};

/**
 * Formats phase data for display
 * @param {Object} phase - Phase object
 * @returns {string} Formatted display string
 */
export const formatPhaseDisplay = (phase) => {
  return `${phase.icon} ${phase.name}`;
};

/**
 * Gets all substages that trigger phase transitions
 * @returns {Array} Array of transition substage IDs
 */
export const getTransitionSubstages = () => {
  return Object.values(PHASE_TRANSITION_TASKS);
};
