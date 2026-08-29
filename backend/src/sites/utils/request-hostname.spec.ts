import { requestHostname } from './request-hostname';

describe('requestHostname', () => {
  it('accepts the forwarded host only from a loopback proxy', () => {
    const request = {
      headers: {
        host: '127.0.0.1:5001',
        'x-forwarded-host': 'Shillong.Localhost:3000',
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
    expect(requestHostname(request as never)).toBe('shillong.localhost');
  });

  it('ignores a spoofed forwarded host from a public client', () => {
    const request = {
      headers: {
        host: 'guwahatihomestay.com',
        'x-forwarded-host': 'evil.example',
      },
      socket: { remoteAddress: '203.0.113.8' },
    };
    expect(requestHostname(request as never)).toBe('guwahatihomestay.com');
  });
});
