import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { APPINSIGHTS_INSTRUMENTATIONKEY } from "../../utils/app/const";
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
// import { createBrowserHistory } from "history";
// const browserHistory = createBrowserHistory({ basename: '' });
var reactPlugin = new ReactPlugin();

// Module-level instance to maintain singleton pattern
let appInsightsInstance: ApplicationInsights | null = null;

export const getAppInsights = (): ApplicationInsights => {
    const instrumentationKey = "9d6a9510-e703-4f95-a9d0-0605e1b1ef42";

    // Validate the necessary environment variables
    if (!instrumentationKey) {
        throw new Error('App Insights Instrumentation Key must be defined in environment variables.');
    }

    // Initialize Application Insights if it hasn't been already
    if (!appInsightsInstance) {
        appInsightsInstance = new ApplicationInsights({
            config: {
              instrumentationKey: "9d6a9510-e703-4f95-a9d0-0605e1b1ef42",
              extensions: [reactPlugin],
              enableAutoRouteTracking: true,
              // Add other configuration options if needed
            }
        });
        appInsightsInstance.loadAppInsights();
    }

    return appInsightsInstance;
};