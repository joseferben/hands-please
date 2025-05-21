import { describe, it, expect } from 'vitest';
import { parseMessage } from './parse-message.js';

describe('parseMessage', () => {
  it('should parse a final system message correctly', () => {
    const json = JSON.stringify({
      role: 'system',
      cost_usd: 0.0123,
      duration_ms: 1500,
      duration_api_ms: 1200
    });
    
    const result = parseMessage(json);
    
    expect(result).toEqual({
      error: false,
      type: 'final',
      text: '$0.01'
    });
  });
  
  it('should parse an assistant message correctly', () => {
    const json = JSON.stringify({
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Hello, world!'
        }
      ]
    });
    
    const result = parseMessage(json);
    
    expect(result).toEqual({
      error: false,
      type: 'assistant',
      text: 'Hello, world!'
    });
  });
  
  it('should handle unknown message formats', () => {
    const json = JSON.stringify({
      role: 'user',
      content: 'Some content'
    });
    
    const result = parseMessage(json);
    
    expect(result).toEqual({
      error: true,
      errorMsg: 'Unknown message format'
    });
  });
  
  it('should handle invalid JSON', () => {
    const json = 'invalid json';
    
    const result = parseMessage(json);
    
    expect(result.error).toBe(true);
    if (result.error) {
      expect(result.errorMsg).toContain('Unexpected token');
    }
  });
});