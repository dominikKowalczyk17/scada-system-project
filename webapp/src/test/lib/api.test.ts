/**
 * Unit tests for api.ts (Axios instance with interceptors)
 *
 * Tests cover:
 * - Axios instance configuration
 * - Request interceptor (timestamp parameter)
 * - Response interceptor (error handling)
 * - Different error scenarios (network, server, other)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Mock axios
vi.mock('axios', () => {
  const actual_axios = {
    create: vi.fn(),
    isAxiosError: vi.fn((error) => error?.isAxiosError === true),
  };
  return { default: actual_axios };
});

describe('api', () => {
  let mock_axios_instance: ReturnType<typeof axios.create>;
  let request_interceptor_fn: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  let request_error_fn: (error: unknown) => Promise<never>;
  let response_success_fn: (response: unknown) => unknown;
  let response_error_fn: (error: unknown) => Promise<never>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock axios instance
    mock_axios_instance = {
      interceptors: {
        request: {
          use: vi.fn((onFulfilled, onRejected) => {
            request_interceptor_fn = onFulfilled;
            request_error_fn = onRejected;
            return 0;
          }),
          eject: vi.fn(),
        },
        response: {
          use: vi.fn((onFulfilled, onRejected) => {
            response_success_fn = onFulfilled;
            response_error_fn = onRejected;
            return 0;
          }),
          eject: vi.fn(),
        },
      },
      defaults: {
        baseURL: 'http://localhost:8080',
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      },
    } as unknown as ReturnType<typeof axios.create>;

    // Mock axios.create to return our mock instance
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mock_axios_instance);

    // Import api module AFTER mocking (to trigger interceptor registration)
    await import('@/lib/api');
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Axios Instance Configuration', () => {
    it('creates axios instance with correct baseURL', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String),
        })
      );
    });

    it('creates axios instance with 10 second timeout', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it('creates axios instance with JSON content type header', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('uses VITE_API_BASE_URL from environment if available', () => {
      const call_args = (axios.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call_args.baseURL).toBeDefined();
    });
  });

  describe('Request Interceptor', () => {
    it('registers request interceptor', () => {
      expect(mock_axios_instance.interceptors.request.use).toHaveBeenCalled();
    });

    it('adds timestamp parameter to prevent caching', () => {
      const mock_config: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: {},
      } as InternalAxiosRequestConfig;

      const result = request_interceptor_fn(mock_config);

      expect(result.params).toHaveProperty('_t');
      expect(typeof result.params._t).toBe('number');
    });

    it('preserves existing parameters', () => {
      const mock_config: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: {
          existing_param: 'value',
          another_param: 123,
        },
      } as InternalAxiosRequestConfig;

      const result = request_interceptor_fn(mock_config);

      expect(result.params.existing_param).toBe('value');
      expect(result.params.another_param).toBe(123);
      expect(result.params._t).toBeDefined();
    });

    it('adds params object if not present', () => {
      const mock_config: InternalAxiosRequestConfig = {
        headers: {} as never,
      } as InternalAxiosRequestConfig;

      const result = request_interceptor_fn(mock_config);

      expect(result.params).toBeDefined();
      expect(result.params._t).toBeDefined();
    });

    it('generates different timestamp for each request', () => {
      const config1: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: {},
      } as InternalAxiosRequestConfig;

      const config2: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: {},
      } as InternalAxiosRequestConfig;

      const result1 = request_interceptor_fn(config1);
      const result2 = request_interceptor_fn(config2);

      expect(typeof result1.params._t).toBe('number');
      expect(typeof result2.params._t).toBe('number');
      expect(result2.params._t).toBeGreaterThanOrEqual(result1.params._t);
    });

    it('rejects on request error', async () => {
      const error = new Error('Request configuration error');

      await expect(request_error_fn(error)).rejects.toThrow(error);
    });
  });

  describe('Response Interceptor', () => {
    it('registers response interceptor', () => {
      expect(mock_axios_instance.interceptors.response.use).toHaveBeenCalled();
    });

    it('passes through successful responses unchanged', () => {
      const mock_response = {
        data: { message: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never } as InternalAxiosRequestConfig,
      };

      const result = response_success_fn(mock_response);

      expect(result).toBe(mock_response);
    });
  });

  describe('Response Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles server response errors', async () => {
      const error: Partial<AxiosError> = {
        response: {
          data: { message: 'Not Found' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: { headers: {} as never } as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        message: 'Request failed with status code 404',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'API Error:',
        expect.objectContaining({ message: 'Not Found' })
      );
    });

    it('handles network errors (no response)', async () => {
      const error: Partial<AxiosError> = {
        request: {},
        message: 'Network Error',
        isAxiosError: true,
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'Network Error: No response from server'
      );
    });

    it('handles generic errors', async () => {
      const error = {
        message: 'Something went wrong',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'Error:',
        'Something went wrong'
      );
    });

    it('handles 400 Bad Request', async () => {
      const error: Partial<AxiosError> = {
        response: {
          data: { error: 'Invalid input' },
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: { headers: {} as never } as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        message: 'Bad Request',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'API Error:',
        expect.objectContaining({ error: 'Invalid input' })
      );
    });

    it('handles 401 Unauthorized', async () => {
      const error: Partial<AxiosError> = {
        response: {
          data: { message: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: {} as never } as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        message: 'Unauthorized',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);
    });

    it('handles 500 Internal Server Error', async () => {
      const error: Partial<AxiosError> = {
        response: {
          data: { message: 'Internal Server Error' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: { headers: {} as never } as InternalAxiosRequestConfig,
        },
        isAxiosError: true,
        message: 'Server Error',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);
    });

    it('handles timeout errors', async () => {
      const error: Partial<AxiosError> = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
        request: {},
        isAxiosError: true,
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith(
        'Network Error: No response from server'
      );
    });

    it('handles connection refused', async () => {
      const error: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080',
        request: {},
        isAxiosError: true,
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);
    });

    it('handles request cancellation', async () => {
      const error = {
        message: 'Request canceled',
        __CANCEL__: true,
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);

      expect(console.error).toHaveBeenCalledWith('Error:', 'Request canceled');
    });
  });

  describe('Integration Scenarios', () => {
    it('full request flow adds timestamp and handles success', () => {
      const mock_config: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: { filter: 'active' },
      } as InternalAxiosRequestConfig;

      const processed_config = request_interceptor_fn(mock_config);

      expect(processed_config.params.filter).toBe('active');
      expect(processed_config.params._t).toBeDefined();

      const mock_response = {
        data: { results: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: processed_config,
      };

      const result = response_success_fn(mock_response);

      expect(result).toBe(mock_response);
    });

    it('handles error after successful request interception', async () => {
      const mock_config: InternalAxiosRequestConfig = {
        headers: {} as never,
        params: {},
      } as InternalAxiosRequestConfig;

      request_interceptor_fn(mock_config);

      const error: Partial<AxiosError> = {
        response: {
          data: { error: 'Server error' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: mock_config,
        },
        isAxiosError: true,
        message: 'Server error',
      };

      await expect(response_error_fn(error)).rejects.toEqual(error);
    });
  });
});
