/**
 * OpenAPI/Swagger Configuration
 *
 * HIPAA Documentation: API documentation for EHR system
 * Note: This documentation is for internal use only.
 * PHI endpoints are marked with security requirements.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import config from '../config';
import { UserRoles, AppointmentStatus, NoteStatus } from '@mentalspace/shared';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'MentalSpace EHR API',
    version: '2.0.0',
    description: `
# MentalSpace EHR API Documentation

A comprehensive Electronic Health Record (EHR) system designed for mental health practices.

## HIPAA Compliance

This API handles Protected Health Information (PHI) and is designed to be HIPAA compliant:
- All PHI endpoints require authentication
- Access is controlled through Role-Based Access Control (RBAC)
- All data access is logged for audit purposes
- Data is encrypted at rest and in transit

## Authentication

This API uses JWT (JSON Web Tokens) for authentication:
1. Obtain tokens via \`POST /api/v1/auth/login\`
2. Include the access token in the \`Authorization\` header: \`Bearer <token>\`
3. Refresh tokens using \`POST /api/v1/auth/refresh\`

## Rate Limiting

API requests are rate-limited to prevent abuse:
- Standard endpoints: 100 requests per 15 minutes
- Authentication endpoints: 10 requests per 15 minutes

## Security Headers

All responses include security headers:
- CSRF protection for state-changing requests
- Content Security Policy
- XSS Protection
    `,
    contact: {
      name: 'MentalSpace Support',
      email: 'support@mentalspace.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.mentalspace.com/api/v1',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Clients',
      description: 'Client (patient) management - Contains PHI',
    },
    {
      name: 'Clinical Notes',
      description: 'Clinical documentation - Contains PHI',
    },
    {
      name: 'Appointments',
      description: 'Scheduling and appointments',
    },
    {
      name: 'Billing',
      description: 'Claims, charges, and payments',
    },
    {
      name: 'Insurance',
      description: 'Insurance information and verification',
    },
    {
      name: 'Users',
      description: 'User management and settings',
    },
    {
      name: 'Organization',
      description: 'Organization settings and configuration',
    },
    {
      name: 'Reports',
      description: 'Analytics and reporting',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /auth/login',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'HTTP-only cookie containing JWT access token',
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF token for state-changing requests',
      },
    },
    schemas: {
      // Error response schema
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
        },
        required: ['success', 'error'],
      },

      // Success response wrapper
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
        required: ['success'],
      },

      // User schema
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          },
          role: {
            type: 'string',
            enum: Object.values(UserRoles),
          },
          isActive: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Client schema (PHI)
      Client: {
        type: 'object',
        description: 'Client record - Contains PHI',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          firstName: {
            type: 'string',
            description: 'PHI - First name',
          },
          lastName: {
            type: 'string',
            description: 'PHI - Last name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'PHI - Email address',
          },
          phone: {
            type: 'string',
            description: 'PHI - Phone number',
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            description: 'PHI - Date of birth',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'DISCHARGED', 'ON_HOLD'],
          },
          address: {
            $ref: '#/components/schemas/Address',
          },
          emergencyContacts: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/EmergencyContact',
            },
          },
        },
        required: ['firstName', 'lastName'],
      },

      // Create client request
      CreateClientRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          lastName: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          email: {
            type: 'string',
            format: 'email',
          },
          phone: {
            type: 'string',
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
          },
        },
        required: ['firstName', 'lastName'],
      },

      // Address schema
      Address: {
        type: 'object',
        properties: {
          street1: { type: 'string' },
          street2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          country: { type: 'string', default: 'US' },
        },
      },

      // Emergency contact schema
      EmergencyContact: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          relationship: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'phone'],
      },

      // Clinical note schema
      ClinicalNote: {
        type: 'object',
        description: 'Clinical documentation - Contains PHI',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          appointmentId: {
            type: 'string',
            format: 'uuid',
          },
          noteType: {
            type: 'string',
            enum: [
              'INTAKE',
              'PROGRESS',
              'DISCHARGE',
              'TREATMENT_PLAN',
              'ASSESSMENT',
              'CRISIS',
              'CONSULTATION',
            ],
          },
          content: {
            type: 'string',
            description: 'PHI - Note content (HTML)',
          },
          status: {
            type: 'string',
            enum: Object.values(NoteStatus),
          },
          authorId: {
            type: 'string',
            format: 'uuid',
          },
          signedAt: {
            type: 'string',
            format: 'date-time',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },

      // Appointment schema
      Appointment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          clinicianId: {
            type: 'string',
            format: 'uuid',
          },
          appointmentTypeId: {
            type: 'string',
            format: 'uuid',
          },
          startTime: {
            type: 'string',
            format: 'date-time',
          },
          endTime: {
            type: 'string',
            format: 'date-time',
          },
          status: {
            type: 'string',
            enum: Object.values(AppointmentStatus),
          },
          locationId: {
            type: 'string',
            format: 'uuid',
          },
          isTelehealth: {
            type: 'boolean',
          },
          notes: {
            type: 'string',
          },
        },
      },

      // Charge schema
      Charge: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          appointmentId: {
            type: 'string',
            format: 'uuid',
          },
          serviceCode: {
            type: 'string',
            description: 'CPT code',
          },
          amount: {
            type: 'number',
            format: 'float',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'DENIED', 'ADJUSTED'],
          },
          diagnosisCodes: {
            type: 'array',
            items: { type: 'string' },
            description: 'ICD-10 codes',
          },
        },
      },

      // Insurance schema
      Insurance: {
        type: 'object',
        description: 'Insurance information - Contains PHI',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          clientId: {
            type: 'string',
            format: 'uuid',
          },
          payerId: {
            type: 'string',
            format: 'uuid',
          },
          memberId: {
            type: 'string',
            description: 'PHI - Insurance member ID',
          },
          groupNumber: {
            type: 'string',
          },
          isPrimary: {
            type: 'boolean',
          },
          effectiveDate: {
            type: 'string',
            format: 'date',
          },
          terminationDate: {
            type: 'string',
            format: 'date',
          },
        },
      },

      // Login request
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
            minLength: 8,
          },
          mfaCode: {
            type: 'string',
            description: 'Required if MFA is enabled',
          },
        },
        required: ['email', 'password'],
      },

      // Login response
      LoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User',
              },
              accessToken: {
                type: 'string',
                description: 'JWT access token (also set in httpOnly cookie)',
              },
              expiresIn: {
                type: 'integer',
                description: 'Token expiration in seconds',
              },
              mfaRequired: {
                type: 'boolean',
              },
            },
          },
        },
      },

      // Pagination parameters
      PaginationParams: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          sortBy: {
            type: 'string',
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Authentication required',
              code: 'UNAUTHORIZED',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions to access this resource',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Access denied',
              code: 'FORBIDDEN',
            },
          },
        },
      },
      NotFoundError: {
        description: 'The requested resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Resource not found',
              code: 'NOT_FOUND',
            },
          },
        },
      },
      ValidationError: {
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: [
                { field: 'email', message: 'Invalid email format' },
              ],
            },
          },
        },
      },
      RateLimitError: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Too many requests, please try again later',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Resource ID',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
