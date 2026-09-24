import cds from '@sap/cds';
import { createNotifier, welcomeMessage } from '../srv/lib/notifier';

const cadet = {
  name: 'Nova Starweaver',
  email: 'nova@example.com',
  originPlanet_code: 'X',
  stardustCollected: 150,
};

describe('welcomeMessage', () => {
  it('addresses the spacefarer and mentions their origin planet', () => {
    const msg = welcomeMessage(cadet);
    expect(msg.to).toBe('nova@example.com');
    expect(msg.subject).toBe('Welcome aboard, Nova Starweaver!');
    expect(msg.text).toContain('Nova Starweaver');
    expect(msg.text).toContain('Planet X');
    expect(msg.text).toContain('150');
  });

  it('copes with a missing planet and stardust', () => {
    const msg = welcomeMessage({ name: 'Drifter', email: 'drifter@example.com' });
    expect(msg.text).toContain('Drifter');
    expect(msg.text).not.toContain('undefined');
    expect(msg.text).not.toContain('null');
    expect(msg.text).not.toContain('Planet');
  });

  it('reads the English text from the messages bundle', () => {
    expect(welcomeMessage(cadet).text).toBe(
      [
        'Congratulations, Nova Starweaver!',
        '',
        'Your launch from Planet X was a success, and your adventurous journey among the stars starts now.',
        'You set off with 150 stardust. May every wormhole lead you somewhere wonderful.',
        '',
        'Clear skies,',
        'Galactic Spacefarer Command',
      ].join('\n'),
    );
  });

  it('takes every text through the injected lookup', () => {
    const text = (key: string, args?: object) => (args ? `${key}${JSON.stringify(args)}` : key);
    const msg = welcomeMessage(cadet, text);
    expect(msg.subject).toBe('WELCOME_SUBJECT{"name":"Nova Starweaver"}');
    expect(msg.text.split('\n')).toEqual([
      'WELCOME_GREETING{"name":"Nova Starweaver"}',
      '',
      'WELCOME_LAUNCH_FROM{"planet":"X"}',
      'WELCOME_STARDUST{"stardust":150}',
      '',
      'WELCOME_SIGN_OFF',
      'WELCOME_SENDER',
    ]);
    expect(welcomeMessage({ name: 'Drifter', email: 'd@example.com' }, text).text).toContain(
      '\nWELCOME_LAUNCH\n',
    );
  });
});

describe('createNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only logs without SMTP_HOST', async () => {
    const connect = vi.fn();
    const info = vi.spyOn(cds.log('notifier'), 'info').mockImplementation(() => undefined);

    await createNotifier({}, connect).sendWelcome(cadet);

    expect(connect).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('[MOCK EMAIL]', {
      to: 'nova@example.com',
      subject: 'Welcome aboard, Nova Starweaver!',
    });
  });

  it('sends through SMTP when SMTP_HOST is set', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const connect = vi.fn().mockResolvedValue({ sendMail });

    const notifier = createNotifier({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '2525' }, connect);
    await notifier.sendWelcome(cadet);
    await notifier.sendWelcome(cadet);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith({ host: 'smtp.example.com', port: 2525 });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'noreply@galactic-adventure.example',
      to: 'nova@example.com',
      subject: 'Welcome aboard, Nova Starweaver!',
      text: expect.stringContaining('Planet X'),
    });
  });

  it('uses the configured sender and port 1025 when SMTP_PORT is empty', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const connect = vi.fn().mockResolvedValue({ sendMail });

    await createNotifier(
      { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '', SMTP_FROM: 'mission@example.com' },
      connect,
    ).sendWelcome(cadet);

    expect(connect).toHaveBeenCalledWith({ host: 'smtp.example.com', port: 1025 });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'mission@example.com' }));
  });

  it('propagates SMTP failures to the caller', async () => {
    const connect = vi.fn().mockResolvedValue({
      sendMail: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    await expect(
      createNotifier({ SMTP_HOST: 'smtp.example.com' }, connect).sendWelcome(cadet),
    ).rejects.toThrow('connection refused');
  });
});
