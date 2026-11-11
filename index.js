import { initGlobalErrorHandlers } from "./src/services/telemetry/crashReporter";

// Initialize global exception & unhandled promise rejection tracking immediately
initGlobalErrorHandlers();

import "expo-router/entry";
