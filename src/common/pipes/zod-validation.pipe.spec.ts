import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  describe('transform', () => {
    it('should return parsed value for valid data', () => {
      const validData = { name: 'John', age: 25 };
      const metadata: ArgumentMetadata = { type: 'body' };

      const result = pipe.transform(validData, metadata);

      expect(result).toEqual(validData);
    });

    it('should throw BadRequestException for invalid data', () => {
      const invalidData = { name: '', age: -5 };
      const metadata: ArgumentMetadata = { type: 'body' };

      expect(() => pipe.transform(invalidData, metadata)).toThrow(BadRequestException);
    });

    it('should create JSON API compliant error response', () => {
      const invalidData = { name: '', age: -5 };
      const metadata: ArgumentMetadata = { type: 'body' };

      try {
        pipe.transform(invalidData, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response).toHaveProperty('errors');
        expect(Array.isArray(response.errors)).toBe(true);
        expect(response.errors[0]).toHaveProperty('status', '400');
        expect(response.errors[0]).toHaveProperty('title', 'Validation Failed');
        expect(response.errors[0]).toHaveProperty('source');
      }
    });

    it('should build correct JSON pointer for body validation', () => {
      const invalidData = { name: '', age: 25 };
      const metadata: ArgumentMetadata = { type: 'body' };

      try {
        pipe.transform(invalidData, metadata);
      } catch (error) {
        const response = error.getResponse();
        expect(response.errors[0].source.pointer).toBe('/data/attributes/name');
      }
    });

    it('should build correct JSON pointer for query validation', () => {
      const querySchema = z.object({ search: z.string().min(1) });
      const queryPipe = new ZodValidationPipe(querySchema);
      const invalidData = { search: '' };
      const metadata: ArgumentMetadata = { type: 'query' };

      try {
        queryPipe.transform(invalidData, metadata);
      } catch (error) {
        const response = error.getResponse();
        expect(response.errors[0].source.pointer).toBe('/query/search');
      }
    });

    it('should handle nested object validation errors', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string().email(),
          }),
        }),
      });
      const nestedPipe = new ZodValidationPipe(nestedSchema);
      const invalidData = { user: { profile: { email: 'invalid-email' } } };
      const metadata: ArgumentMetadata = { type: 'body' };

      try {
        nestedPipe.transform(invalidData, metadata);
      } catch (error) {
        const response = error.getResponse();
        expect(response.errors[0].source.pointer).toBe('/data/attributes/user/profile/email');
      }
    });

    it('should include Zod error metadata', () => {
      const invalidData = { name: '', age: -5 };
      const metadata: ArgumentMetadata = { type: 'body' };

      try {
        pipe.transform(invalidData, metadata);
      } catch (error) {
        const response = error.getResponse();
        const firstError = response.errors[0];
        expect(firstError.meta).toHaveProperty('zodErrorCode');
        expect(firstError.meta).toHaveProperty('path');
      }
    });
  });
});
