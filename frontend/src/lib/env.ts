// Frontend environment configuration utility
// Note: In Vite, only variables prefixed with VITE_ are exposed to the client

/// <reference types="vite/client" />

interface AppConfig {
  // API Configuration
  apiUrl: string;
  
  // Application Configuration
  appName: string;
  appVersion: string;
  appDescription: string;
  
  // Authentication Configuration
  jwtStorageKey: string;
  sessionTimeoutMinutes: number;
  
  // Feature Flags
  enableLLMChat: boolean;
  enableDebugTerminal: boolean;
  enableUserRegistration: boolean;
  enableEmailVerification: boolean;
  
  // UI Configuration
  defaultTheme: 'light' | 'dark' | 'system';
  defaultLanguage: string;
  enableThemeToggle: boolean;
  
  // Analytics & Monitoring (Optional)
  googleAnalyticsId?: string;
  sentryDsn?: string;
  
  // File Upload Configuration
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // Development Configuration
  isDevelopment: boolean;
  enableDevTools: boolean;
  showPerformanceMetrics: boolean;
}

// Parse environment variables with defaults
const parseEnv = (): AppConfig => {
  // Helper function to parse boolean values
  const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  };

  // Helper function to parse number values
  const parseNumber = (value: string | undefined, defaultValue: number): number => {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Helper function to parse file types
  const parseFileTypes = (value: string | undefined): string[] => {
    if (!value) return ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    return value.split(',').map(type => type.trim());
  };

  return {
    // API Configuration
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    
    // Application Configuration
    appName: import.meta.env.VITE_APP_NAME || 'Web App Template',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'A production-ready web application template',
    
    // Authentication Configuration
    jwtStorageKey: import.meta.env.VITE_JWT_STORAGE_KEY || 'webappauth',
    sessionTimeoutMinutes: parseNumber(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES, 1440), // 24 hours
    
    // Feature Flags
    enableLLMChat: parseBoolean(import.meta.env.VITE_ENABLE_LLM_CHAT, true),
    enableDebugTerminal: parseBoolean(import.meta.env.VITE_ENABLE_DEBUG_TERMINAL, true),
    enableUserRegistration: parseBoolean(import.meta.env.VITE_ENABLE_USER_REGISTRATION, true),
    enableEmailVerification: parseBoolean(import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION, false),
    
    // UI Configuration
    defaultTheme: (import.meta.env.VITE_DEFAULT_THEME as 'light' | 'dark' | 'system') || 'light',
    defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
    enableThemeToggle: parseBoolean(import.meta.env.VITE_ENABLE_THEME_TOGGLE, true),
    
    // Analytics & Monitoring (Optional)
    googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    
    // File Upload Configuration
    maxFileSize: parseNumber(import.meta.env.VITE_MAX_FILE_SIZE, 5242880), // 5MB
    allowedFileTypes: parseFileTypes(import.meta.env.VITE_ALLOWED_FILE_TYPES),
    
    // Development Configuration
    isDevelopment: import.meta.env.DEV,
    enableDevTools: parseBoolean(import.meta.env.VITE_ENABLE_DEV_TOOLS, true),
    showPerformanceMetrics: parseBoolean(import.meta.env.VITE_SHOW_PERFORMANCE_METRICS, false),
  };
};

// Export configuration object
export const config = parseEnv();

// Helper functions
export const isFeatureEnabled = (feature: keyof Pick<AppConfig, 'enableLLMChat' | 'enableDebugTerminal' | 'enableUserRegistration' | 'enableEmailVerification' | 'enableThemeToggle' | 'enableDevTools' | 'showPerformanceMetrics'>): boolean => {
  return config[feature];
};

export const getApiUrl = (path: string = ''): string => {
  return `${config.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const isFileSizeValid = (size: number): boolean => {
  return size <= config.maxFileSize;
};

export const isFileTypeAllowed = (type: string): boolean => {
  return config.allowedFileTypes.includes(type);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Configuration summary for debugging
export const getConfigSummary = () => {
  if (!config.isDevelopment) return null;
  
  return {
    environment: 'development',
    apiUrl: config.apiUrl,
    appName: config.appName,
    features: {
      llmChat: config.enableLLMChat,
      debugTerminal: config.enableDebugTerminal,
      userRegistration: config.enableUserRegistration,
      emailVerification: config.enableEmailVerification,
    },
    analytics: {
      googleAnalytics: !!config.googleAnalyticsId,
      sentry: !!config.sentryDsn,
    },
  };
};