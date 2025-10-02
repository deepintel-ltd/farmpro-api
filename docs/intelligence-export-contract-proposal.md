# Intelligence API Contract Enhancements

## Overview
This document proposes **minimal, essential enhancements** to the intelligence contract based on what's actually being used in the IntelligencePage. No over-engineering, just what users need.

## Current Reality
**IntelligencePage actually uses:**
- 4 mutation hooks (generate, analyze farm, analyze market, optimize activity)
- 5 query hooks (list analyses, history, quick insights)
- 1 export hook (doesn't exist yet - needs to be added)

**DashboardPage doesn't use intelligence at all.**

## Proposed API Enhancements

### 1. Export Intelligence Data (MISSING - NEEDED NOW)

```typescript
exportIntelligence: {
  method: "POST";
  description: "Export intelligence insights, analyses, and history as PDF";
  summary: "Export intelligence data as PDF";
  body: z.ZodObject<{
    farmId: z.ZodString;
    includeInsights: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeAnalyses: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeHistory: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dateRange: z.ZodOptional<z.ZodObject<{
      start: z.ZodDate;
      end: z.ZodDate;
    }>>;
  }>;
  path: "/intelligence/export";
  responses: {
    200: z.ZodObject<{
      downloadUrl: z.ZodString;
      expiresAt: z.ZodDate;
      fileSize: z.ZodNumber;
    }>;
  };
};
```

### 2. Enhanced Insights Structure (MINOR UPDATE)

```typescript
// Update existing insights to include priority (already being used in UI)
insightResponse: z.ZodObject<{
  id: z.ZodString;
  content: z.ZodString;
  priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high", "critical"]>>; // ADD THIS
  category: z.ZodOptional<z.ZodEnum<["efficiency", "performance", "market", "sustainability", "risk"]>>; // ADD THIS
  createdAt: z.ZodDate;
  farmId: z.ZodString;
  userId: z.ZodString;
  model: z.ZodString;
  usage: z.ZodObject<{
    promptTokens: z.ZodNumber;
    completionTokens: z.ZodNumber;
    totalTokens: z.ZodNumber;
  }>;
}>;
```

### 3. Enhanced Error Handling (MINOR UPDATE)

```typescript
// Add better error messages for existing endpoints
errorResponse: z.ZodObject<{
  error: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
    requestId: z.ZodString;
  }>;
  suggestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}>;
```

## Implementation Priority

### Phase 1 (ESSENTIAL - Do This First)
1. **Add `exportIntelligence` endpoint** - The IntelligencePage is already trying to use this
2. **Add `priority` and `category` to insights** - UI is already displaying these
3. **Better error messages** - Users need to know what went wrong

### Phase 2 (NICE TO HAVE - Only if users ask)
1. **Intelligence dashboard endpoint** - Only if users want a dedicated dashboard
2. **Analytics endpoint** - Only if users want performance metrics

## What We're NOT Adding

❌ **WebSocket support** - Polling works fine, no one asked for real-time
❌ **Complex analytics** - No one uses this
❌ **Custom reports** - Export covers this
❌ **Advanced visualizations** - Current charts are sufficient
❌ **Health checks** - Not used in UI
❌ **Individual analysis endpoints** - Not used in UI

## Benefits

1. **Fixes broken export** - IntelligencePage export button will work
2. **Better UX** - Priority/category chips will show real data
3. **Clear errors** - Users know what went wrong
4. **Minimal effort** - Only 3 small changes needed

## Technical Implementation

### Export Implementation
- **Simple PDF generation** - Generate PDF on demand using jsPDF
- **Temporary storage** - Store files for 24 hours, then delete
- **Direct download** - Return download URL immediately
- **No async processing** - Keep it simple

### Priority/Category Enhancement
- **Backward compatible** - Make fields optional
- **Default values** - Use "medium" priority, "general" category if not provided
- **No breaking changes** - Existing code continues to work

### Error Handling
- **Consistent format** - Same error structure across all endpoints
- **User-friendly messages** - "Failed to analyze farm" instead of "500 error"
- **Actionable suggestions** - "Try again in a few minutes" or "Check your internet connection"

## Success Metrics

1. **Export works** - Users can download intelligence reports
2. **UI shows real data** - Priority chips display actual priorities
3. **Better error UX** - Users understand what went wrong
4. **No complaints** - Users don't ask for missing features

This is the **minimum viable enhancement** that fixes what's broken and improves what's already there. No over-engineering, just practical improvements.
