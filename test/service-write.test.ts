import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';

describe('GalacticService write isolation and drafts', () => {
  const test = cds.test(__dirname + '/..');

  const as = (user: string) => ({
    auth: { username: user, password: user },
    validateStatus: () => true,
  });
  const draftOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=false)`;
  const activeOf = (ID: string) => `/galactic/Spacefarers(ID=${ID},IsActiveEntity=true)`;
  const activate = (ID: string, user: string) =>
    test.post(`${draftOf(ID)}/GalacticService.draftActivate`, {}, as(user));
  const edit = (ID: string, user: string) =>
    test.post(`${activeOf(ID)}/GalacticService.draftEdit`, { PreserveChanges: true }, as(user));
  const discard = (ID: string, user: string) => test.delete(draftOf(ID), as(user));
  const planetInDb = async (ID: string) =>
    (await SELECT.one.from('db.Spacefarer', ID).columns('originPlanet_code'))?.originPlanet_code;

  const NOVA = '10000000-0000-0000-0000-000000000001';
  const VEGA = '20000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await test;
  });

  describe('plain POST on the draft-enabled entity', () => {
    it('creates a draft (IsActiveEntity=false), not an active row', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: 'Draft Only', email: 'draft.only@example.com', originPlanet_code: 'X' },
        as('alice'),
      );
      expect(res.status).toBe(201);
      expect(res.data.IsActiveEntity).toBe(false);
      expect(await SELECT.one.from('db.Spacefarer', res.data.ID)).toBeUndefined();

      const act = await activate(res.data.ID, 'alice');
      expect(act.status).toBe(201);
      expect(act.data.IsActiveEntity).toBe(true);
      expect(await planetInDb(res.data.ID)).toBe('X');
    });
  });

  describe('create (draft create + activate, as Fiori does)', () => {
    it('derives the planet from the user when none is given', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: 'No Planet', email: 'no.planet@example.com' },
        as('alice'),
      );
      expect(res.status).toBe(201);
      expect(res.data.originPlanet_code).toBe('X');
      expect((await activate(res.data.ID, 'alice')).status).toBe(201);
      expect(await planetInDb(res.data.ID)).toBe('X');
    });

    it('rejects alice creating a Planet Y spacefarer with 403', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: 'Smuggled Y', originPlanet_code: 'Y' },
        as('alice'),
      );
      expect(res.status).toBe(403);
      expect(res.data.error).toMatchObject({
        code: 'SPACEFARER_PLANET_FORBIDDEN',
        message: 'Spacefarers must stay on Planet X',
      });
      expect(await SELECT.from('db.Spacefarer').where({ name: 'Smuggled Y' })).toHaveLength(0);
    });

    it('rejects the structured association form too', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: 'Smuggled Y2', originPlanet: { code: 'Y' } },
        as('alice'),
      );
      expect(res.status).toBe(403);
    });

    it('rejects patching a new draft to Planet Y, and activation keeps Planet X', async () => {
      const { data } = await test.post(
        '/galactic/Spacefarers',
        { name: 'Switcher', email: 'switcher@example.com' },
        as('alice'),
      );
      const patch = await test.patch(draftOf(data.ID), { originPlanet_code: 'Y' }, as('alice'));
      expect(patch.status).toBe(403);
      expect((await activate(data.ID, 'alice')).status).toBe(201);
      expect(await planetInDb(data.ID)).toBe('X');
    });

    it('rejects activation of a draft that holds another planet', async () => {
      // write past the service to plant Planet Y in the draft
      const { data } = await test.post(
        '/galactic/Spacefarers',
        { name: 'Planted', email: 'planted@example.com' },
        as('alice'),
      );
      await UPDATE('GalacticService.Spacefarers.drafts', data.ID).with({ originPlanet_code: 'Y' });
      const act = await activate(data.ID, 'alice');
      expect(act.status).toBe(403);
      expect(await SELECT.one.from('db.Spacefarer', data.ID)).toBeUndefined();
      await discard(data.ID, 'alice');
    });

    it('hides alice’s new spacefarers from bob', async () => {
      const { data } = await test.get(
        "/galactic/Spacefarers?$filter=name eq 'No Planet'",
        as('bob'),
      );
      expect(data.value).toHaveLength(0);
    });

    it('lets admin create a spacefarer on any planet', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: 'Admin Made', email: 'admin.made@example.com', originPlanet_code: 'Y' },
        as('admin'),
      );
      expect(res.status).toBe(201);
      expect((await activate(res.data.ID, 'admin')).status).toBe(201);
      expect(await planetInDb(res.data.ID)).toBe('Y');
    });
  });

  describe('update (draft edit + activate)', () => {
    it('rejects alice moving her Planet X spacefarer to Planet Y', async () => {
      expect((await edit(NOVA, 'alice')).status).toBe(201);
      const patch = await test.patch(draftOf(NOVA), { originPlanet_code: 'Y' }, as('alice'));
      expect(patch.status).toBe(403);
      expect((await activate(NOVA, 'alice')).status).toBe(200);
      expect(await planetInDb(NOVA)).toBe('X');
    });

    it('rejects activating an edit draft that holds another planet', async () => {
      expect((await edit(NOVA, 'alice')).status).toBe(201);
      await UPDATE('GalacticService.Spacefarers.drafts', NOVA).with({ originPlanet_code: 'Y' });
      expect((await activate(NOVA, 'alice')).status).toBe(403);
      expect(await planetInDb(NOVA)).toBe('X');
      await discard(NOVA, 'alice');
    });

    it('rejects a direct PATCH of the active entity to Planet Y', async () => {
      const res = await test.patch(activeOf(NOVA), { originPlanet_code: 'Y' }, as('alice'));
      expect(res.status).toBe(403);
      expect(await planetInDb(NOVA)).toBe('X');
    });

    it('rejects alice editing a Planet Y spacefarer', async () => {
      expect((await edit(VEGA, 'alice')).status).toBe(403);
    });

    it('rejects alice deleting a Planet Y spacefarer', async () => {
      expect((await test.delete(activeOf(VEGA), as('alice'))).status).toBe(403);
      expect(await planetInDb(VEGA)).toBe('Y');
    });
  });

  describe('read-only avatar URL', () => {
    const TRACKER = 'https://tracker.example.com/pixel.svg';
    const avatarInDb = async (ID: string) =>
      (await SELECT.one.from('db.Spacefarer', ID).columns('avatarUrl'))?.avatarUrl;

    it.each([
      ['alice', NOVA, 'images/spacefarers/nova-starweaver.svg'],
      ['admin', VEGA, 'images/spacefarers/vega-cometrider.svg'],
    ])('ignores %s patching the avatar URL in an edit draft', async (user, ID, avatar) => {
      expect((await edit(ID, user)).status).toBe(201);
      const patch = await test.patch(draftOf(ID), { avatarUrl: TRACKER }, as(user));
      expect(patch.status).toBe(200);
      expect(patch.data.avatarUrl).toBe(avatar);
      expect((await activate(ID, user)).status).toBe(200);
      expect(await avatarInDb(ID)).toBe(avatar);
    });

    it('ignores admin patching the avatar URL of the active entity directly', async () => {
      const patch = await test.patch(activeOf(VEGA), { avatarUrl: TRACKER }, as('admin'));
      expect(patch.status).toBe(200);
      expect(await avatarInDb(VEGA)).toBe('images/spacefarers/vega-cometrider.svg');
    });

    it.each(['alice', 'admin'])('ignores %s posting an avatar URL', async (user) => {
      const res = await test.post(
        '/galactic/Spacefarers',
        { name: `Tracked by ${user}`, email: `tracked.${user}@example.com`, avatarUrl: TRACKER },
        as(user),
      );
      expect(res.status).toBe(201);
      expect(res.data.avatarUrl).toBeNull();
      expect((await activate(res.data.ID, user)).status).toBe(201);
      expect(await avatarInDb(res.data.ID)).toBeNull();
    });
  });

  describe('read-only planet image URL', () => {
    const TRACKER = 'https://tracker.example.com/pixel.svg';
    const planetImageInDb = async () =>
      (await SELECT.one.from('db.Planet').where({ code: 'X' }).columns('imageUrl'))?.imageUrl;

    it('rejects admin patching a planet', async () => {
      const res = await test.patch("/galactic/Planets('X')", { imageUrl: TRACKER }, as('admin'));
      expect(res.status).toBe(405);
      expect(await planetImageInDb()).toBe('images/planets/planet-x.svg');
    });

    it('rejects a planet image sent along with a new spacefarer', async () => {
      const res = await test.post(
        '/galactic/Spacefarers',
        {
          name: 'Deep Writer',
          email: 'deep.writer@example.com',
          originPlanet: { code: 'X', imageUrl: TRACKER },
        },
        as('alice'),
      );
      expect(res.status).toBe(400);
      expect(await planetImageInDb()).toBe('images/planets/planet-x.svg');
    });
  });

  describe('stardust status on the draft path', () => {
    it('recalculates status in the draft after a PATCH and supports $filter/$orderby', async () => {
      expect((await edit(NOVA, 'alice')).status).toBe(201);
      const patch = await test.patch(draftOf(NOVA), { stardustCollected: 2500 }, as('alice'));
      expect(patch.status).toBe(200);

      const draft = await test.get(draftOf(NOVA), as('alice'));
      expect(draft.data).toMatchObject({ stardustStatus: 'Stellar', stardustCriticality: 3 });

      const filtered = await test.get(
        "/galactic/Spacefarers?$filter=IsActiveEntity eq false and stardustStatus eq 'Stellar'",
        as('alice'),
      );
      expect(filtered.status).toBe(200);
      expect(filtered.data.value.map((s: Spacefarer) => s.ID)).toEqual([NOVA]);

      const ordered = await test.get(
        '/galactic/Spacefarers?$filter=IsActiveEntity eq false&$orderby=stardustStatus desc',
        as('alice'),
      );
      expect(ordered.status).toBe(200);
      expect(ordered.data.value[0]).toMatchObject({ ID: NOVA, stardustStatus: 'Stellar' });

      const act = await activate(NOVA, 'alice');
      expect(act.status).toBe(200);
      expect(act.data).toMatchObject({ stardustStatus: 'Stellar', stardustCriticality: 3 });
    });
  });

  describe('missions in the spacefarer draft (Object Page table)', () => {
    const LYRA = '10000000-0000-0000-0000-000000000003';
    const VOID_RECON = '30000000-0000-0000-0000-000000000003';
    const missionsInDb = async () =>
      (await SELECT.from('db.Mission').where({ spacefarer_ID: LYRA }).columns('title')).map(
        (m: { title: string }) => m.title,
      );

    it('adds a mission through the draft and saves it with the spacefarer', async () => {
      expect((await edit(LYRA, 'alice')).status).toBe(201);
      const added = await test.post(
        `${draftOf(LYRA)}/missions`,
        { title: 'Pulsar Patrol', startDate: '2026-10-01' },
        as('alice'),
      );
      expect(added.status).toBe(201);
      expect(added.data).toMatchObject({ status: 'planned', statusCriticality: 0 });
      expect(await missionsInDb()).not.toContain('Pulsar Patrol');

      expect((await activate(LYRA, 'alice')).status).toBe(200);
      expect(await missionsInDb()).toContain('Pulsar Patrol');
    });

    it('deletes a mission through the draft on save', async () => {
      expect((await edit(LYRA, 'alice')).status).toBe(201);
      const missionDraft = `/galactic/Missions(ID=${VOID_RECON},IsActiveEntity=false)`;
      expect((await test.delete(missionDraft, as('alice'))).status).toBe(204);
      expect(await missionsInDb()).toContain('Void Reconnaissance');

      expect((await activate(LYRA, 'alice')).status).toBe(200);
      expect(await missionsInDb()).not.toContain('Void Reconnaissance');
    });

    it('keeps the active missions and values when the draft is discarded', async () => {
      const before = await missionsInDb();
      expect((await edit(LYRA, 'alice')).status).toBe(201);
      await test.patch(draftOf(LYRA), { stardustCollected: 1 }, as('alice'));
      await test.post(`${draftOf(LYRA)}/missions`, { title: 'Never Flown' }, as('alice'));

      expect((await discard(LYRA, 'alice')).status).toBe(204);
      expect(await missionsInDb()).toEqual(before);
      const lyra = await SELECT.one.from('db.Spacefarer', LYRA).columns('stardustCollected');
      expect(lyra?.stardustCollected).toBe(3500);
    });
  });
});
