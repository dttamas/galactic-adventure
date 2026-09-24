import cds from '@sap/cds';
import type GalacticService from '../srv/galactic-service';
import type { Spacefarer } from '#cds-models/GalacticService';
import { welcomeOnLaunch } from '../srv/handlers/welcome';
import type { Notifier } from '../srv/lib/notifier';

describe('welcome email (after CREATE)', () => {
  const test = cds.test(__dirname + '/..');

  const as = (user: string) => ({
    auth: { username: user, password: user },
    validateStatus: () => true,
  });
  const draftOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=false)`;
  const activeOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=true)`;
  const activate = (ID: string) =>
    test.post(`${draftOf(ID)}/GalacticService.draftActivate`, {}, as('alice'));
  const edit = (ID: string) =>
    test.post(`${activeOf(ID)}/GalacticService.draftEdit`, { PreserveChanges: true }, as('alice'));
  const discard = (ID: string) => test.delete(draftOf(ID), as('alice'));

  const createDraft = async (data: object) => {
    const res = await test.post('/galactic/Spacefarers', data, as('alice'));
    expect(res.status).toBe(201);
    return res.data.ID as string;
  };
  const patchDraft = async (ID: string, data: object) => {
    expect((await test.patch(draftOf(ID), data, as('alice'))).status).toBe(200);
  };

  const NOVA = '10000000-0000-0000-0000-000000000001';

  let sendWelcome: ReturnType<typeof vi.fn<Parameters<Notifier['sendWelcome']>, Promise<void>>>;
  const sentTo = () => sendWelcome.mock.calls.map(([s]) => s.email);

  // a successful launch after the negative case proves its email would have arrived by now
  const launchMarker = async () => {
    const ID = await createDraft({ name: 'Marker Cadet', email: 'marker@example.com' });
    expect((await activate(ID)).status).toBe(201);
    await vi.waitFor(() => expect(sentTo()).toContain('marker@example.com'));
  };

  beforeAll(async () => {
    await test;
  });

  beforeEach(async () => {
    sendWelcome = vi.fn().mockResolvedValue(undefined);
    const srv = (await cds.connect.to('GalacticService')) as GalacticService;
    srv.notifier = { sendWelcome };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('welcomes the new spacefarer once after activation', async () => {
    const ID = await createDraft({
      name: 'Luna Comet',
      email: 'luna@example.com',
      stardustCollected: 40,
    });
    expect((await activate(ID)).status).toBe(201);

    await vi.waitFor(() => expect(sendWelcome).toHaveBeenCalled());
    expect(sendWelcome).toHaveBeenCalledTimes(1);
    expect(sendWelcome).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Luna Comet',
        email: 'luna@example.com',
        originPlanet_code: 'X',
        stardustCollected: 40,
      }),
    );
  });

  it('does not send for a draft that is only created and edited', async () => {
    const ID = await createDraft({ name: 'Draft Cadet', email: 'draft@example.com' });
    await patchDraft(ID, { stardustCollected: 5 });
    await launchMarker();
    expect(sentTo()).toEqual(['marker@example.com']);
    await discard(ID);
  });

  it('does not send when activation fails', async () => {
    const ID = await createDraft({ name: 'Lost Cadet', email: 'lost@example.com' });
    await patchDraft(ID, { wormholeNavSkill: 11 });
    expect((await activate(ID)).status).toBe(400);
    await launchMarker();
    expect(sentTo()).toEqual(['marker@example.com']);
    await discard(ID);
  });

  it('does not send when the launch is rolled back after the after-handler ran', async () => {
    const ID = await createDraft({ name: 'Doomed Cadet', email: 'doomed@example.com' });
    const inGroup = (id: string, method: string, url: string, body: object) => ({
      id,
      atomicityGroup: 'launch',
      method,
      url,
      headers: { 'content-type': 'application/json' },
      body,
    });
    const batch = await test.post(
      '/galactic/$batch',
      {
        requests: [
          inGroup(
            '1',
            'POST',
            `Spacefarers(ID=${ID},IsActiveEntity=false)/GalacticService.draftActivate`,
            {},
          ),
          inGroup('2', 'PATCH', `Spacefarers(ID=${NOVA},IsActiveEntity=true)`, {
            wormholeNavSkill: 99,
          }),
        ],
      },
      as('alice'),
    );
    const statuses = (batch.data.responses as { id: string; status: number }[]).map(
      (r) => r.status,
    );
    expect(statuses.some((s) => s >= 400)).toBe(true);
    const statusOf = Object.fromEntries(
      (batch.data.responses as { id: string; status: number }[]).map((r) => [r.id, r.status]),
    );
    // 201 on the activation proves the after-handler ran before the group rolled back
    expect(statusOf).toEqual({ '1': 201, '2': 400 });
    expect(await SELECT.one.from('db.Spacefarer', ID)).toBeUndefined();

    await launchMarker();
    expect(sentTo()).toEqual(['marker@example.com']);
    await discard(ID);
  });

  it('does not send when an existing spacefarer is edited and saved', async () => {
    expect((await edit(NOVA)).status).toBe(201);
    await patchDraft(NOVA, { email: 'nova.new@example.com' });
    expect((await activate(NOVA)).status).toBe(200);
    await launchMarker();
    expect(sentTo()).toEqual(['marker@example.com']);
  });

  it('does not send when a blank email blocks the launch', async () => {
    const ID = await createDraft({ name: 'Blank Cadet', email: '   ' });
    expect((await activate(ID)).status).toBe(400);
    expect(await SELECT.one.from('db.Spacefarer', ID)).toBeUndefined();
    await launchMarker();
    expect(sentTo()).toEqual(['marker@example.com']);
    await discard(ID);
  });

  it('logs a failed email without failing the launch', async () => {
    sendWelcome.mockRejectedValue(new Error('solar flare'));
    const error = vi.spyOn(cds.log('notifier'), 'error').mockImplementation(() => undefined);

    const ID = await createDraft({ name: 'Unlucky Cadet', email: 'unlucky@example.com' });
    expect((await activate(ID)).status).toBe(201);

    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'welcome email failed',
        expect.objectContaining({ message: 'solar flare' }),
      ),
    );
  });

  it('survives a notifier that throws synchronously', async () => {
    sendWelcome.mockImplementation(() => {
      throw new Error('mailbox imploded');
    });
    const error = vi.spyOn(cds.log('notifier'), 'error').mockImplementation(() => undefined);

    const ID = await createDraft({ name: 'Brave Cadet', email: 'brave@example.com' });
    expect((await activate(ID)).status).toBe(201);

    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'welcome email failed',
        expect.objectContaining({ message: 'mailbox imploded' }),
      ),
    );
  });
});

describe('welcomeOnLaunch without an email', () => {
  it('registers nothing and never calls the notifier', () => {
    const sendWelcome = vi.fn();
    const req = { data: { name: 'Silent Cadet', email: null }, on: vi.fn() };
    welcomeOnLaunch(() => ({ sendWelcome }))(undefined, req as unknown as cds.Request<Spacefarer>);
    expect(req.on).not.toHaveBeenCalled();
    expect(sendWelcome).not.toHaveBeenCalled();
  });
});
