// DVM Event Kinds - Standardized across the application
export const DVM_KINDS = {
    REQUEST: 5600,  // DVM job request
    RESPONSE: 5601, // DVM job result  
    FEEDBACK: 7000  // DVM job feedback
}

// Export individual constants for convenience
export const DVM_REQUEST_KIND = 5600
export const DVM_RESPONSE_KIND = 5601
export const DVM_FEEDBACK_KIND = 7000