import cds from '@sap/cds';

describe('prepare spacefaring candidate (before CREATE/UPDATE)', () => {
  const test = cds.test(__dirname + '/..');

  const as = (user: string) => ({
    auth: { username: user, password: user },
    validateStatus: () => true,
  });
  const draftOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=false)`;
  const activeOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=true)`;
  const activate = (ID: string, user = 'alice') =>
    test.post(`${draftOf(ID)}/GalacticService.draftActivate`, {}, as(user));
  const edit = (ID: string, user = 'alice') =>
    test.post(`${activeOf(ID)}/GalacticService.draftEdit`, { PreserveChanges: true }, as(user));
  const discard = (ID: string, user = 'alice') => test.delete(draftOf(ID), as(user));
  const inDb = (ID: string) => SELECT.one.from('db.Spacefarer', ID);

  const createDraft = async (data: object, user = 'alice') => {
    const res = await test.post(
      '/galactic/Spacefarers',
      { name: 'Cadet', email: 'cadet@example.com', ...data },
      as(user),
    );
    expect(res.status).toBe(201);
    return res.data.ID as string;
  };
  const patchDraft = async (ID: string, data: object, user = 'alice') => {
    const res = await test.patch(draftOf(ID), data, as(user));
    expect(res.status).toBe(200);
  };
  const errorsOf = (data: {
    error: { message: string; target?: string; details?: { message: string; target?: string }[] };
  }) => data.error.details ?? [data.error];

  const NOVA = '10000000-0000-0000-0000-000000000001';
  const ORION = '10000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    await test;
  });

  it('activates a valid candidate with its values', async () => {
    const ID = await createDraft({ name: 'Valid Cadet', stardustCollected: 300 });
    await patchDraft(ID, { wormholeNavSkill: 10 });
    const act = await activate(ID);
    expect(act.status).toBe(201);
    expect(await inDb(ID)).toMatchObject({ stardustCollected: 300, wormholeNavSkill: 10 });
  });

  it('applies defaults when the fields were cleared in the draft', async () => {
    const ID = await createDraft({ name: 'Cleared Cadet' });
    await patchDraft(ID, { stardustCollected: null, wormholeNavSkill: null });
    const act = await activate(ID);
    expect(act.status).toBe(201);
    expect(act.data).toMatchObject({ stardustCollected: 0, wormholeNavSkill: 1 });
    expect(await inDb(ID)).toMatchObject({ stardustCollected: 0, wormholeNavSkill: 1 });
  });

  it.each([0, 11])('rejects wormholeNavSkill %i with 400 on the skill field', async (skill) => {
    const ID = await createDraft({ name: `Skill ${skill}` });
    await patchDraft(ID, { wormholeNavSkill: skill });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual([
      expect.objectContaining({
        message: 'Wormhole navigation skill must be between 1 and 10',
        target: 'wormholeNavSkill',
      }),
    ]);
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('rejects negative stardust with 400 on the stardust field', async () => {
    const ID = await createDraft({ name: 'Negative Cadet' });
    await patchDraft(ID, { stardustCollected: -5 });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual([
      expect.objectContaining({
        message: 'Stardust collected must be 0 or more',
        target: 'stardustCollected',
      }),
    ]);
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('reports both errors together', async () => {
    const ID = await createDraft({ name: 'Double Trouble' });
    await patchDraft(ID, { stardustCollected: -1, wormholeNavSkill: 11 });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data).map((e) => e.target)).toEqual(
      expect.arrayContaining(['stardustCollected', 'wormholeNavSkill']),
    );
    expect(errorsOf(act.data)).toHaveLength(2);

    const draft = await test.get(`${draftOf(ID)}?$select=DraftMessages`, as('alice'));
    expect(draft.data.DraftMessages.map((m: { target: string }) => m.target)).toEqual(
      expect.arrayContaining(
        ['wormholeNavSkill', 'stardustCollected'].map(
          (field) => `/Spacefarers(ID=${ID},IsActiveEntity=false)/${field}`,
        ),
      ),
    );
    await discard(ID);
  });

  it('trims the name and title-cases the spacesuit colour', async () => {
    const ID = await createDraft({ name: '  Tidy Cadet ', spacesuitColor: ' silver ' });
    expect((await activate(ID)).status).toBe(201);
    expect(await inDb(ID)).toMatchObject({ name: 'Tidy Cadet', spacesuitColor: 'Silver' });

    const ID2 = await createDraft({ name: 'Blue Cadet', spacesuitColor: 'deep  SPACE blue' });
    expect((await activate(ID2)).status).toBe(201);
    expect(await inDb(ID2)).toMatchObject({ spacesuitColor: 'Deep Space Blue' });
  });

  it('rejects saving an edited spacefarer with skill 11', async () => {
    expect((await edit(NOVA)).status).toBe(201);
    await patchDraft(NOVA, { wormholeNavSkill: 11 });
    const act = await activate(NOVA);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)[0]).toMatchObject({ target: 'wormholeNavSkill' });
    expect(await inDb(NOVA)).toMatchObject({ wormholeNavSkill: 7 });
    await discard(NOVA);
  });

  it('rejects a direct PATCH of the active entity with negative stardust', async () => {
    const res = await test.patch(activeOf(NOVA), { stardustCollected: -10 }, as('alice'));
    expect(res.status).toBe(400);
    expect(await inDb(NOVA)).toMatchObject({ stardustCollected: 1200 });
  });

  it('rejects a whitespace-only name on create', async () => {
    const ID = await createDraft({ name: '   ' });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual([
      expect.objectContaining({ message: 'Name is required', target: 'in/name' }),
    ]);
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('rejects blanking the name of an existing spacefarer', async () => {
    expect((await edit(NOVA)).status).toBe(201);
    await patchDraft(NOVA, { name: '  ' });
    const act = await activate(NOVA);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual([
      expect.objectContaining({ message: 'Name is required', target: 'in/name' }),
    ]);
    expect(await inDb(NOVA)).toMatchObject({ name: 'Nova Starweaver' });
    await discard(NOVA);
  });

  it('accepts a partial update that does not touch the name', async () => {
    const res = await test.patch(activeOf(ORION), { wormholeNavSkill: 6 }, as('alice'));
    expect(res.status).toBe(200);
    expect(await inDb(ORION)).toMatchObject({
      name: 'Orion Blackhole',
      email: 'orion.blackhole@example.com',
      wormholeNavSkill: 6,
    });
  });

  it('rejects an email with several recipients with 400 on the email field', async () => {
    const ID = await createDraft({
      name: 'Spammy Cadet',
      email: 'spammy@example.com, victim@example.com',
    });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual([
      expect.objectContaining({
        message: 'Email must be a single valid address',
        target: 'email',
      }),
    ]);
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('accepts a single email and trims it', async () => {
    const ID = await createDraft({ name: 'Mail Cadet', email: ' mail.cadet@example.com ' });
    expect((await activate(ID)).status).toBe(201);
    expect(await inDb(ID)).toMatchObject({ email: 'mail.cadet@example.com' });
  });

  // @mandatory targets draftActivate errors at the action's binding parameter ('in/')
  const emailRequired = (target: string) => [
    expect.objectContaining({ message: 'Email is required', target }),
  ];

  it('rejects a blank email on create with one error on the email field', async () => {
    const ID = await createDraft({ name: 'Blank Mail Cadet', email: '   ' });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual(emailRequired('in/email'));
    expect(await inDb(ID)).toBeUndefined();

    const draft = await test.get(`${draftOf(ID)}?$select=DraftMessages`, as('alice'));
    expect(draft.data.DraftMessages).toEqual([
      expect.objectContaining({
        message: 'Email is required',
        target: `/Spacefarers(ID=${ID},IsActiveEntity=false)/email`,
      }),
    ]);
    await discard(ID);
  });

  it('rejects a create without email', async () => {
    const ID = await createDraft({ name: 'No Mail Cadet', email: undefined });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual(emailRequired('in/email'));
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('saves a draft without email; only activation needs it', async () => {
    const ID = await createDraft({ name: 'Undecided Cadet', email: undefined });
    await patchDraft(ID, { stardustCollected: 3 });
    await patchDraft(ID, { email: null });
    expect((await activate(ID)).status).toBe(400);
    await patchDraft(ID, { email: 'decided@example.com' });
    expect((await activate(ID)).status).toBe(201);
    expect(await inDb(ID)).toMatchObject({ email: 'decided@example.com', stardustCollected: 3 });
  });

  it('rejects blanking the email of an existing spacefarer', async () => {
    expect((await edit(NOVA)).status).toBe(201);
    await patchDraft(NOVA, { email: '  ' });
    const act = await activate(NOVA);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toEqual(emailRequired('in/email'));
    expect(await inDb(NOVA)).toMatchObject({ email: 'nova.starweaver@example.com' });
    await discard(NOVA);
  });

  it('rejects clearing the email with a direct PATCH', async () => {
    const res = await test.patch(activeOf(ORION), { email: null }, as('alice'));
    expect(res.status).toBe(400);
    expect(errorsOf(res.data)).toEqual(emailRequired('email'));
    expect(await inDb(ORION)).toMatchObject({ email: 'orion.blackhole@example.com' });
  });

  it('reports a blank name and a blank email together on activation', async () => {
    const ID = await createDraft({ name: '  ', email: '  ' });
    const act = await activate(ID);
    expect(act.status).toBe(400);
    expect(errorsOf(act.data)).toHaveLength(2);
    expect(errorsOf(act.data)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Name is required', target: 'in/name' }),
        expect.objectContaining({ message: 'Email is required', target: 'in/email' }),
      ]),
    );
    expect(await inDb(ID)).toBeUndefined();
    await discard(ID);
  });

  it('rejects blanking the name with a direct PATCH', async () => {
    const res = await test.patch(activeOf(ORION), { name: '  ' }, as('alice'));
    expect(res.status).toBe(400);
    expect(errorsOf(res.data)).toEqual([
      expect.objectContaining({ message: 'Name is required', target: 'name' }),
    ]);
    expect(await inDb(ORION)).toMatchObject({ name: 'Orion Blackhole' });
  });

  it('rejects an invalid email on a direct PATCH', async () => {
    const res = await test.patch(activeOf(ORION), { email: 'not-an-email' }, as('alice'));
    expect(res.status).toBe(400);
    expect(errorsOf(res.data)).toEqual([
      expect.objectContaining({
        code: 'SPACEFARER_EMAIL_INVALID',
        message: 'Email must be a single valid address',
        target: 'email',
      }),
    ]);
    expect(await inDb(ORION)).toMatchObject({ email: 'orion.blackhole@example.com' });
  });

  it('still enforces the planet guard', async () => {
    const res = await test.post(
      '/galactic/Spacefarers',
      { name: 'Smuggler', originPlanet_code: 'Y' },
      as('alice'),
    );
    expect(res.status).toBe(403);
  });
});
