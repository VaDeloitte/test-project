// ✅ Utility functions for handling workflows with proper field checking

/**
 * Check if a workflow is a legacy workflow (no new attributes)
 */
export const isLegacyWorkflow = (workflow) => {
  return !workflow.hasOwnProperty('tgpublish') && 
         !workflow.hasOwnProperty('createdby') && 
         !workflow.hasOwnProperty('model');
};

/**
 * Check if a workflow is published (for displaying in UI)
 * Legacy workflows (no tgpublish field) are considered published
 * New workflows must have tgpublish === 'true'
 */
export const isPublishedWorkflow = (workflow) => {
  // Legacy workflows (no tgpublish field) are considered published
  if (!workflow.hasOwnProperty('tgpublish')) {
    return true;
  } else if (workflow.createdby === "system") {
    return true;
  }
  
  // New workflows must have tgpublish === 'true'
  return workflow.tgPublish === 'true';
};

/**
 * Check if a workflow was created by a user (agent extraction with email)
 * User-created agents have email addresses in createdby field
 */
export const isAgentExtractedWorkflow = (workflow) => {
  // Check if createdby field contains an email pattern (user@domain.com)
  return workflow.hasOwnProperty('createdBy') && 
         workflow.createdBy && 
         /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workflow.createdBy);
};

/**
 * Get the workflow type for categorization
 */
export const getWorkflowType = (workflow) => {
  if (isLegacyWorkflow(workflow)) return 'legacy';
  if (isAgentExtractedWorkflow(workflow)) return 'agent-extracted';
  return 'standard';
};

/**
 * Filter workflows for Service Lines (published only)
 */
export const filterServiceLineWorkflows = (workflows) => {
  return workflows.filter(w => {
    const isServiceLine = (w.category === "Service Lines"||w.category === "Enabling Functions")&&w.category!=="General Use Cases"&&(w.tgPublish||w.createdBy==='system');
    // const isPublished = isPublishedWorkflow(w);
    return isServiceLine ;
  });
};

/**
 * Filter workflows for TG Agents (agent-extracted only)
 */
export const filterTGAgentWorkflows = (workflows) => {
  return workflows.filter(w => isAgentExtractedWorkflow(w));
};

/**
 * Get field status for debugging
 */
export const getWorkflowFieldStatus = (workflow) => {
  return {
    id: workflow._id,
    title: workflow.title,
    hasTPGPublish: workflow.hasOwnProperty('tgPublish'),
    tgpublishValue: workflow.tgPublish || 'undefined',
    hasCreatedBy: workflow.hasOwnProperty('createdBy'),
    createdbyValue: workflow.createdBy || 'undefined',
    hasModel: workflow.hasOwnProperty('model'),
    modelValue: workflow.model || 'undefined',
    type: getWorkflowType(workflow)
  };
};
