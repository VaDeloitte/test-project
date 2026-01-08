import { User } from "@/types";
import { getAppInsights } from "../lib/getAppInsights";
import { SeverityLevel, IExceptionTelemetry } from '@microsoft/applicationinsights-web';

type LogLevel = 'Verbose' | 'Information' | 'Warning' | 'Error' | 'Critical';

const severityLevelMap: Record<LogLevel, SeverityLevel> = {
    'Verbose': SeverityLevel.Verbose,
    'Information': SeverityLevel.Information,
    'Warning': SeverityLevel.Warning,
    'Error': SeverityLevel.Error,
    'Critical': SeverityLevel.Critical
};

// Define a type for the console methods we'll use
type ConsoleMethod = 'log' | 'info' | 'warn' | 'error';

const consoleLogMap: Record<LogLevel, ConsoleMethod> = {
    'Verbose': 'log',
    'Information': 'info',
    'Warning': 'warn',
    'Error': 'error',
    'Critical': 'error'
};

export const logMessage = (
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    user?: User | null,
    properties?: Record<string, any> | null
) => {
    const appInsights = getAppInsights();
    const actualUser = user || null;

    if (appInsights) {
        if (actualUser && actualUser.email) {
            appInsights.setAuthenticatedUserContext(actualUser.email, actualUser.accountId, true);
        }

        const commonProperties = {
            ...(properties || {}),
            userName: actualUser?.username || 'Anonymous',
            appName: process.env.NEXT_PUBLIC_APP_INSIGHT_APPNAME,
        };

        // Log as a trace
        appInsights.trackTrace({
            message: message,
            severityLevel: severityLevelMap[level],
            properties: commonProperties
        });

        // If it's an error or critical, also log as an exception
        if (level === 'Error' || level === 'Critical') {
            const exceptionTelemetry: IExceptionTelemetry = {
                exception: error instanceof Error ? error : new Error(message),
                severityLevel: severityLevelMap[level],
                properties: {
                    ...commonProperties,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    errorName: error instanceof Error ? error.name : 'Unknown Error',
                    errorStack: error instanceof Error ? error.stack : 'No stack trace available',
                }
            };
            appInsights.trackException(exceptionTelemetry);
        }
    }

    const isDevelopment = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_AUTH_REQUIRED !== 'true';
    if (isDevelopment) {
        // Log to console for debugging
        const consoleMethod = consoleLogMap[level];
        console[consoleMethod](`[${level}] ${message}`, error || properties || '');
    }
};

// Convenience functions for different log levels
export const logVerbose = (message: string, user?: User | null, properties?: Record<string, any> | null) =>
    logMessage('Verbose', message, null, user, properties);

export const logInfo = (message: string, user?: User | null, properties?: Record<string, any> | null) =>
    logMessage('Information', message, null, user, properties);

export const logWarning = (message: string, error?: Error | unknown, user?: User | null, properties?: Record<string, any> | null) =>
    logMessage('Warning', message, error, user, properties);

export const logError = (message: string, error?: Error | unknown, user?: User | null, properties?: Record<string, any> | null) =>
    logMessage('Error', message, error, user, properties);

export const logCritical = (message: string, error?: Error | unknown, user?: User | null, properties?: Record<string, any> | null) =>
    logMessage('Critical', message, error, user, properties);