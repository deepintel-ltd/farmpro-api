# Error Response Utility

A centralized utility for handling common error patterns and creating consistent error responses across the application.

## Features

- **Consistent Error Detection**: Automatically detects common error types (not found, bad request, unauthorized, conflict)
- **Standardized Responses**: Creates JSON API compliant error responses
- **Type Safety**: Fully typed with TypeScript for better development experience
- **Reduced Boilerplate**: Eliminates repetitive error handling code

## Usage

### Basic Error Handling

```typescript
import { ErrorResponseUtil } from '../common/utils/error-response.util';

// In your controller
try {
  const result = await this.service.someOperation();
  return { status: 200, body: result };
} catch (error) {
  this.logger.error('Operation failed:', error);
  
  return ErrorResponseUtil.handleCommonError(error, {
    notFoundMessage: 'Resource not found',
    notFoundCode: 'RESOURCE_NOT_FOUND',
    badRequestMessage: 'Invalid request data',
    badRequestCode: 'INVALID_REQUEST',
    internalErrorMessage: 'Operation failed',
    internalErrorCode: 'OPERATION_FAILED',
  });
}
```

### Specific Error Types

```typescript
// Create specific error responses
return ErrorResponseUtil.notFound(error, 'User not found', 'USER_NOT_FOUND');
return ErrorResponseUtil.badRequest(error, 'Invalid input', 'INVALID_INPUT');
return ErrorResponseUtil.unauthorized(error, 'Access denied', 'ACCESS_DENIED');
return ErrorResponseUtil.conflict(error, 'Resource exists', 'RESOURCE_EXISTS');
return ErrorResponseUtil.internalServerError(error, 'Server error', 'SERVER_ERROR');

// For successful DELETE operations
return ErrorResponseUtil.noContent();
```

### Error Detection

```typescript
// Check error types
if (ErrorResponseUtil.isNotFound(error)) {
  // Handle not found error
}

if (ErrorResponseUtil.isBadRequest(error)) {
  // Handle validation error
}

if (ErrorResponseUtil.isUnauthorized(error)) {
  // Handle auth error
}

if (ErrorResponseUtil.isConflict(error)) {
  // Handle conflict error
}
```

## Error Response Format

All error responses follow the JSON API error format:

```json
{
  "errors": [
    {
      "status": "404",
      "title": "Not Found",
      "detail": "The requested resource was not found",
      "code": "RESOURCE_NOT_FOUND"
    }
  ]
}
```

## Error Detection Patterns

The utility automatically detects errors based on message content:

- **Not Found**: Messages containing "not found", "Not found", or "does not exist"
- **Bad Request**: Messages containing "validation", "required", "invalid", or "Invalid"
- **Unauthorized**: Messages containing "unauthorized", "Unauthorized", "Invalid credentials", or "disabled"
- **Conflict**: Messages containing "already exists", "already verified", "conflict", or "Conflict"

## Benefits

1. **Consistency**: All error responses follow the same format
2. **Maintainability**: Centralized error handling logic
3. **Type Safety**: Full TypeScript support with proper typing
4. **Reduced Code**: Less boilerplate in controllers
5. **Standardization**: JSON API compliant error responses
6. **Flexibility**: Can handle both automatic detection and manual error creation

## Integration with Controllers

The utility is designed to work seamlessly with ts-rest controllers:

```typescript
@Controller()
export class MyController {
  @TsRestHandler(contract.getResource)
  public getResource(@Request() req: AuthenticatedRequest): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(contract.getResource, async ({ params }) => {
      try {
        const result = await this.service.getResource(params.id);
        return { status: 200 as const, body: result };
      } catch (error) {
        this.logger.error(`Get resource ${params.id} failed:`, error);
        
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Resource not found',
          notFoundCode: 'RESOURCE_NOT_FOUND',
          internalErrorMessage: 'Failed to retrieve resource',
          internalErrorCode: 'GET_RESOURCE_FAILED',
        });
      }
    });
  }
}
```

This approach ensures consistent error handling across all endpoints while reducing code duplication and improving maintainability.
