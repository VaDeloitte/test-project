import { User } from "@/types";
import { getAppInsights } from "../lib/getAppInsights";
import { WorkflowI } from "@/types/workflow";

export const SendUserLoggedInMetric = (user: User) => {
    if (user) {
        const appInsights = getAppInsights();
        if (user && user.email) {
            appInsights.setAuthenticatedUserContext(user.email, user.accountId, true);
            appInsights.trackEvent({
                name: 'UserLoggedIn' as string,
                properties: {
                    'appName': 'TaxGenie-NPD',
                    'userName': user.username
                },
            });
        }
    }
};

export const SendPromptUsedMetric = (user: User, promptContent : string | undefined) => {
    if (user) {
        const appInsights = getAppInsights();
        if (user && user.email) {
            appInsights.setAuthenticatedUserContext(user.email, user.accountId, true);
            appInsights.trackEvent({
                name: 'UserPrompted' as string,
                properties: {
                    'appName': 'TaxGenie-NPD',
                    'userName': user.username,
                    'promptContent' : promptContent
                },
            });
        }
    }
};

export const SendWorkflowUsedMetric = (user: User, workflow: WorkflowI | undefined) => {
    if (user) {
        const appInsights = getAppInsights();
        if (user && user.email && workflow) {
            const { prompt, ...workflowWithoutPrompt } = workflow;
            appInsights.setAuthenticatedUserContext(user.email, user.accountId, true);
            appInsights.trackEvent({
                name: 'UserWorkflowUsed' as string,
                properties: {
                    'appName': 'TaxGenie-NPD',
                    'userName': user.username,
                    'workflow': workflowWithoutPrompt
                },
            });
        }
    }
};