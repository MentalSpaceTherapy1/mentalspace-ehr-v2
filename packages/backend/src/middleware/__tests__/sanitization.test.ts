/**
 * Input Sanitization Middleware Tests
 *
 * Tests for XSS, SQL injection, and other attack prevention
 */

import { Request, Response, NextFunction } from 'express';
import {
  escapeHtml,
  stripDangerousHtml,
  containsSqlInjection,
  containsNoSqlInjection,
  containsPathTraversal,
  containsCommandInjection,
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeId,
  createSanitizationMiddleware,
  SanitizationError,
} from '../sanitization';

describe('Sanitization Middleware', () => {
  // ==========================================================================
  // HTML Escaping Tests
  // ==========================================================================
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;');
      expect(escapeHtml("It's fine")).toBe('It&#x27;s fine');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(escapeHtml('Normal text')).toBe('Normal text');
    });
  });

  // ==========================================================================
  // Dangerous HTML Stripping Tests
  // ==========================================================================
  describe('stripDangerousHtml', () => {
    it('should remove script tags', () => {
      expect(stripDangerousHtml('<script>alert("xss")</script>')).toBe('');
    });

    it('should remove event handlers', () => {
      expect(stripDangerousHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
      expect(stripDangerousHtml('<div onclick="hack()">Click</div>')).not.toContain('onclick');
    });

    it('should remove javascript: URLs', () => {
      expect(stripDangerousHtml('<a href="javascript:alert(1)">Click</a>')).not.toContain('javascript:');
    });

    it('should remove style tags', () => {
      expect(stripDangerousHtml('<style>body{display:none}</style>')).toBe('');
    });

    it('should remove iframe tags', () => {
      expect(stripDangerousHtml('<iframe src="evil.com"></iframe>')).toBe('');
    });

    it('should preserve safe content', () => {
      expect(stripDangerousHtml('<p>Hello <b>World</b></p>')).toBe('<p>Hello <b>World</b></p>');
    });

    it('should handle nested dangerous elements', () => {
      const input = '<div><script>alert(1)</script><p>Safe</p></div>';
      expect(stripDangerousHtml(input)).toBe('<div><p>Safe</p></div>');
    });
  });

  // ==========================================================================
  // SQL Injection Detection Tests
  // ==========================================================================
  describe('containsSqlInjection', () => {
    it('should detect basic SQL injection', () => {
      expect(containsSqlInjection("' OR '1'='1")).toBe(true);
      expect(containsSqlInjection("' OR 1=1--")).toBe(true);
      expect(containsSqlInjection("'; DROP TABLE users;--")).toBe(true);
    });

    it('should detect UNION-based injection', () => {
      expect(containsSqlInjection("UNION SELECT * FROM users")).toBe(true);
      expect(containsSqlInjection("' UNION ALL SELECT username, password FROM users--")).toBe(true);
    });

    it('should detect time-based injection', () => {
      expect(containsSqlInjection("'; SLEEP(5)--")).toBe(true);
      expect(containsSqlInjection("'; WAITFOR DELAY '0:0:5'--")).toBe(true);
    });

    it('should not flag normal input', () => {
      expect(containsSqlInjection("John's Pizza")).toBe(false);
      expect(containsSqlInjection("SELECT from dropdown")).toBe(false);
      expect(containsSqlInjection("Order #12345")).toBe(false);
    });

    it('should detect information_schema access', () => {
      expect(containsSqlInjection("SELECT * FROM information_schema.tables")).toBe(true);
    });
  });

  // ==========================================================================
  // NoSQL Injection Detection Tests
  // ==========================================================================
  describe('containsNoSqlInjection', () => {
    it('should detect MongoDB operators', () => {
      expect(containsNoSqlInjection('{"$gt": ""}')).toBe(true);
      expect(containsNoSqlInjection('{"$ne": null}')).toBe(true);
      expect(containsNoSqlInjection('{"$where": "this.password"}')).toBe(true);
    });

    it('should detect MongoDB $or injection', () => {
      expect(containsNoSqlInjection('{"$or": [{"a": "b"}]}')).toBe(true);
    });

    it('should not flag normal JSON', () => {
      expect(containsNoSqlInjection('{"name": "John", "age": 30}')).toBe(false);
      expect(containsNoSqlInjection('{"email": "test@example.com"}')).toBe(false);
    });
  });

  // ==========================================================================
  // Path Traversal Detection Tests
  // ==========================================================================
  describe('containsPathTraversal', () => {
    it('should detect basic path traversal', () => {
      expect(containsPathTraversal('../../../etc/passwd')).toBe(true);
      expect(containsPathTraversal('..\\..\\..\\windows\\system32')).toBe(true);
    });

    it('should detect URL-encoded traversal', () => {
      expect(containsPathTraversal('%2e%2e%2f%2e%2e%2f')).toBe(true);
      expect(containsPathTraversal('..%2f..%2f')).toBe(true);
    });

    it('should not flag normal paths', () => {
      expect(containsPathTraversal('/home/user/documents')).toBe(false);
      expect(containsPathTraversal('reports/2024/january.pdf')).toBe(false);
    });
  });

  // ==========================================================================
  // Command Injection Detection Tests
  // ==========================================================================
  describe('containsCommandInjection', () => {
    it('should detect command chaining', () => {
      expect(containsCommandInjection('; cat /etc/passwd')).toBe(true);
      expect(containsCommandInjection('| cat /etc/shadow')).toBe(true);
      expect(containsCommandInjection('&& rm -rf /')).toBe(true);
    });

    it('should detect command substitution', () => {
      expect(containsCommandInjection('`cat /etc/passwd`')).toBe(true);
      expect(containsCommandInjection('$(whoami)')).toBe(false); // Only dangerous with command
    });

    it('should not flag normal text', () => {
      expect(containsCommandInjection('Hello World')).toBe(false);
      expect(containsCommandInjection('Price: $50')).toBe(false);
    });
  });

  // ==========================================================================
  // String Sanitization Tests
  // ==========================================================================
  describe('sanitizeString', () => {
    it('should trim whitespace by default', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should respect maxLength', () => {
      const longString = 'a'.repeat(1000);
      expect(sanitizeString(longString, { maxLength: 100 })).toBe('a'.repeat(100));
    });

    it('should strip dangerous HTML by default', () => {
      expect(sanitizeString('<script>alert(1)</script>Safe')).toBe('Safe');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should preserve newlines when allowed', () => {
      expect(sanitizeString('hello\nworld', { allowNewlines: true })).toBe('hello\nworld');
    });
  });

  // ==========================================================================
  // Email Sanitization Tests
  // ==========================================================================
  describe('sanitizeEmail', () => {
    it('should lowercase and trim email', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeEmail('test<script>@example.com')).toBe('testscript@example.com');
    });

    it('should handle normal email', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    });
  });

  // ==========================================================================
  // Phone Number Sanitization Tests
  // ==========================================================================
  describe('sanitizePhoneNumber', () => {
    it('should keep only phone-valid characters', () => {
      expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizePhoneNumber('555<script>123')).toBe('555123');
    });

    it('should handle various formats', () => {
      expect(sanitizePhoneNumber('555.123.4567')).toBe('5551234567');
    });
  });

  // ==========================================================================
  // URL Sanitization Tests
  // ==========================================================================
  describe('sanitizeUrl', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should allow normal URLs', () => {
      expect(sanitizeUrl('https://example.com/page')).toBe('https://example.com/page');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeUrl('https://example.com/<script>')).toBe('https://example.com/script');
    });
  });

  // ==========================================================================
  // Filename Sanitization Tests
  // ==========================================================================
  describe('sanitizeFilename', () => {
    it('should remove path traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('should remove path separators', () => {
      expect(sanitizeFilename('path/to\\file.txt')).toBe('pathtofile.txt');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<>|?.txt')).toBe('file.txt');
    });

    it('should preserve normal filenames', () => {
      expect(sanitizeFilename('report-2024.pdf')).toBe('report-2024.pdf');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });

  // ==========================================================================
  // ID Sanitization Tests
  // ==========================================================================
  describe('sanitizeId', () => {
    it('should allow UUIDs', () => {
      expect(sanitizeId('123e4567-e89b-12d3-a456-426614174000')).toBe(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should allow numeric IDs', () => {
      expect(sanitizeId('12345')).toBe('12345');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeId("12345'; DROP TABLE--")).toBe('12345DROPTABLE--');
    });

    it('should truncate long IDs', () => {
      const longId = 'a'.repeat(200);
      expect(sanitizeId(longId).length).toBe(100);
    });
  });

  // ==========================================================================
  // Middleware Tests
  // ==========================================================================
  describe('createSanitizationMiddleware', () => {
    const mockRequest = (body: any = {}, query: any = {}, params: any = {}, path: string = '/api/test') =>
      ({
        body,
        query,
        params,
        path,
        method: 'POST',
        ip: '127.0.0.1',
        get: jest.fn(),
      } as unknown as Request);

    const mockResponse = () => {
      const res: Partial<Response> = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res as Response;
    };

    it('should sanitize request body', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({ name: '  Test  ', description: '<script>bad</script>Safe' });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.name).toBe('Test');
      expect(req.body.description).toBe('Safe');
      expect(next).toHaveBeenCalled();
    });

    it('should block SQL injection in body', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({ search: "'; DROP TABLE users;--" });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block path traversal in params', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({}, {}, { file: '../../../etc/passwd' });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip sanitization for configured paths', () => {
      const middleware = createSanitizationMiddleware({ skipPaths: ['/health'] });
      const req = mockRequest({ malicious: "'; DROP TABLE--" }, {}, {}, '/health');
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.malicious).toBe("'; DROP TABLE--"); // Not sanitized
      expect(next).toHaveBeenCalled();
    });

    it('should allow HTML in configured fields', () => {
      const middleware = createSanitizationMiddleware({
        allowHtmlFields: ['notes'],
      });
      const req = mockRequest({
        notes: '<p>This is <b>important</b></p>',
        title: '<script>bad</script>Title',
      });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.notes).toContain('<p>');
      expect(req.body.title).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({
        user: {
          name: '  John  ',
          address: {
            street: '<script>bad</script>123 Main St',
          },
        },
      });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.user.name).toBe('John');
      expect(req.body.user.address.street).toBe('123 Main St');
      expect(next).toHaveBeenCalled();
    });

    it('should handle arrays', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({
        tags: ['  tag1  ', '<script>bad</script>tag2'],
      });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.tags[0]).toBe('tag1');
      expect(req.body.tags[1]).toBe('tag2');
      expect(next).toHaveBeenCalled();
    });

    it('should preserve non-string values', () => {
      const middleware = createSanitizationMiddleware();
      const req = mockRequest({
        count: 42,
        active: true,
        data: null,
      });
      const res = mockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.count).toBe(42);
      expect(req.body.active).toBe(true);
      expect(req.body.data).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const middleware = createSanitizationMiddleware();
      const req = { body: {}, query: {}, params: {}, path: '/test' } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle unicode characters', () => {
      const result = sanitizeString('日本語テスト 中文测试 한국어테스트');
      expect(result).toBe('日本語テスト 中文测试 한국어테스트');
    });

    it('should handle emojis', () => {
      const result = sanitizeString('Hello 👋 World 🌍');
      expect(result).toBe('Hello 👋 World 🌍');
    });

    it('should handle clinical note content', () => {
      const clinicalNote = `
        Patient reports feeling anxious and overwhelmed.

        S: "I've been having trouble sleeping lately."
        O: Patient appears fatigued, cooperative.
        A: Generalized Anxiety Disorder (F41.1)
        P: Continue current medication; follow-up in 2 weeks.
      `;
      const result = sanitizeString(clinicalNote, { allowNewlines: true });
      expect(result).toContain('Patient reports');
      expect(result).toContain('F41.1');
      expect(result).toContain('\n');
    });
  });
});
