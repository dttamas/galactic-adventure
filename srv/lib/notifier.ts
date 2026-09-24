import cds from '@sap/cds';

const LOG = cds.log('notifier');

export type WelcomeRecipient = {
  name: string;
  email: string;
  originPlanet_code?: string | null;
  stardustCollected?: number | null;
};

export interface Notifier {
  sendWelcome(spacefarer: WelcomeRecipient): Promise<void>;
}

export type Mail = { to: string; subject: string; text: string };

type SmtpOptions = { host: string; port: number };
type Transport = { sendMail(mail: Mail & { from: string }): Promise<unknown> };
export type Connect = (options: SmtpOptions) => Promise<Transport>;

export function welcomeMessage(s: WelcomeRecipient): Mail {
  const origin = s.originPlanet_code ? ` from Planet ${s.originPlanet_code}` : '';
  return {
    to: s.email,
    subject: `Welcome aboard, ${s.name}!`,
    text: [
      `Congratulations, ${s.name}!`,
      '',
      `Your launch${origin} was a success, and your adventurous journey among the stars starts now.`,
      `You set off with ${s.stardustCollected ?? 0} stardust. May every wormhole lead you somewhere wonderful.`,
      '',
      'Clear skies,',
      'Galactic Spacefarer Command',
    ].join('\n'),
  };
}

// loaded on first send, so nodemailer stays unloaded while SMTP is off
const connectNodemailer: Connect = async (options) => {
  const { default: nodemailer } = await import('nodemailer');
  return nodemailer.createTransport(options);
};

export function createNotifier(env = process.env, connect = connectNodemailer): Notifier {
  if (!env.SMTP_HOST) {
    return {
      async sendWelcome(s) {
        const { to, subject } = welcomeMessage(s);
        LOG.info('[MOCK EMAIL]', { to, subject });
      },
    };
  }

  const options = { host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 1025) };
  const from = env.SMTP_FROM ?? 'noreply@galactic-adventure.example';
  let transport: Promise<Transport> | undefined;
  return {
    async sendWelcome(s) {
      transport ??= connect(options);
      await (await transport).sendMail({ from, ...welcomeMessage(s) });
    },
  };
}
