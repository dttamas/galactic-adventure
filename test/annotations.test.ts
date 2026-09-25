import cds from '@sap/cds';

type Annotations = Record<string, Record<string, unknown>>;
type FieldGroup = { Data: { Value: { $Path: string }; Criticality?: { $Path: string } }[] };
type Facet = { '@type': string; ID: string; Label?: string; Target: string };
type ValueList = {
  CollectionPath: string;
  PresentationVariantQualifier?: string;
  Parameters: { LocalDataProperty?: string; ValueListProperty: string }[];
};

describe('Fiori annotations in the GalacticService metadata', () => {
  const test = cds.test(__dirname + '/..');
  let annotations: Annotations, hungarian: Annotations;
  const spacefarers = () => annotations['GalacticService.Spacefarers'];
  const property = (name: string) => annotations[`GalacticService.Spacefarers/${name}`] ?? {};

  // the JSON flavour of the localized $metadata the Fiori app loads
  const metadata = async (url: string, language: string): Promise<Annotations> => {
    const res = await fetch(`${url}/galactic/$metadata?$format=json`, {
      headers: {
        Authorization: `Basic ${Buffer.from('alice:alice').toString('base64')}`,
        'Accept-Language': language,
      },
    });
    return (await res.json()).GalacticService.$Annotations;
  };

  beforeAll(async () => {
    // test.get is not ready yet when parallel beforeAll hooks resume, but the listening url is
    const { url } = await test;
    annotations = await metadata(url, 'en');
    hungarian = await metadata(url, 'hu');
  });

  // CAP's own bundle translates common keys such as Name; ours are namespaced to stay English
  it('keeps our labels English for a Hungarian browser', () => {
    const labelsOf = (a: Annotations) =>
      [
        'Spacefarers/name',
        'Spacefarers/email',
        'Spacefarers/rank_code',
        'Departments/name',
        'Positions/title',
        'StardustStatuses/code',
      ].map((target) => a[`GalacticService.${target}`]?.['@Common.Label']);
    expect(labelsOf(hungarian)).toEqual(labelsOf(annotations));
    expect(labelsOf(hungarian)).toEqual([
      'Name',
      'Email',
      'Rank',
      'Name',
      'Title',
      'Stardust Status',
    ]);
  });

  it('lists the spacefarer columns, with stardust status coloured by its criticality', () => {
    const lineItem = spacefarers()['@UI.LineItem'] as {
      Value: { $Path: string };
      Criticality?: { $Path: string };
    }[];
    expect(lineItem.map((c) => c.Value.$Path)).toEqual([
      'avatarUrl',
      'name',
      'originPlanet_code',
      'spacesuitColor',
      'stardustCollected',
      'stardustStatus',
      'wormholeNavSkill',
      'rank_code',
    ]);
    const status = lineItem.find((c) => c.Value.$Path === 'stardustStatus');
    expect(status?.Criticality).toEqual({ $Path: 'stardustCriticality' });
  });

  // with a fixed width on every column the table renders an empty filler column on wide screens
  it('lets the text columns share the spare width, next to a narrow avatar column', () => {
    const lineItem = spacefarers()['@UI.LineItem'] as {
      Value: { $Path: string };
      '@HTML5.CssDefaults'?: { width: string };
    }[];
    expect(
      lineItem
        .filter((c) => c['@HTML5.CssDefaults'])
        .map((c) => [c.Value.$Path, c['@HTML5.CssDefaults']?.width]),
    ).toEqual([
      ['avatarUrl', '5rem'],
      ['name', 'auto'],
      ['originPlanet_code', 'auto'],
      ['spacesuitColor', 'auto'],
      ['rank_code', 'auto'],
    ]);
  });

  it('renders the avatar column as an image', () => {
    expect(property('avatarUrl')['@UI.IsImageURL']).toBe(true);
  });

  // FE then draws round avatars with a person placeholder instead of square product ones
  it('marks spacefarers as natural persons', () => {
    expect(spacefarers()['@Common.IsNaturalPerson']).toBe(true);
  });

  it('keeps the avatar URL out of the filters', () => {
    expect(property('avatarUrl')['@UI.HiddenFilter']).toBe(true);
  });

  it('gives the wormhole column a shorter label than the field', () => {
    const lineItem = spacefarers()['@UI.LineItem'] as {
      Value: { $Path: string };
      Label?: string;
    }[];
    const wormhole = lineItem.find((c) => c.Value.$Path === 'wormholeNavSkill');
    expect(wormhole?.Label).toBe('Wormhole Skill');
    expect(lineItem.filter((c) => c.Label).map((c) => c.Value.$Path)).toEqual(['wormholeNavSkill']);
  });

  it('hides the stardust criticality from filters, personalisation and the object page', () => {
    expect(property('stardustCriticality')['@UI.Hidden']).toBe(true);
    const fields = Object.entries(spacefarers())
      .filter(([term]) => term.startsWith('@UI.FieldGroup#'))
      .flatMap(([, group]) => (group as FieldGroup).Data.map((d) => d.Value.$Path));
    expect(fields).toContain('stardustStatus');
    expect(fields).not.toContain('stardustCriticality');
  });

  it('hides the technical spacefarer ID, but not the IDs of the value-help entities', () => {
    expect(property('ID')['@UI.Hidden']).toBe(true);
    expect(annotations['GalacticService.Departments/ID']['@UI.Hidden']).toBeUndefined();
    expect(annotations['GalacticService.Positions/ID']['@UI.Hidden']).toBeUndefined();
  });

  it('offers filters for planet, rank, department and stardust status', () => {
    expect(spacefarers()['@UI.SelectionFields']).toEqual([
      'originPlanet_code',
      'rank_code',
      'department_ID',
      'stardustStatus',
    ]);
  });

  it('sorts the list by name ascending by default', () => {
    expect(spacefarers()['@UI.PresentationVariant']).toEqual({
      SortOrder: [{ Property: 'name' }],
      Visualizations: ['@UI.LineItem'],
    });
  });

  it.each([
    ['originPlanet_code', 'originPlanet/name'],
    ['rank_code', 'rank/name'],
    ['department_ID', 'department/name'],
    ['position_ID', 'position/title'],
  ])('shows %s as the text %s instead of the key', (key, text) => {
    expect(property(key)['@Common.Text']).toEqual({ $Path: text });
    expect(property(key)['@Common.Text@UI.TextArrangement']).toBe('TextOnly');
  });

  it.each([
    ['originPlanet_code', 'Planets', true],
    ['rank_code', 'Ranks', true],
    ['department_ID', 'Departments', false],
    ['position_ID', 'Positions', false],
    ['stardustStatus', 'StardustStatuses', true],
  ])('offers a value help for %s from %s (fixed values: %s)', (key, collection, fixed) => {
    const valueList = property(key)['@Common.ValueList'] as ValueList;
    expect(valueList.CollectionPath).toBe(collection);
    expect(valueList.Parameters[0].LocalDataProperty).toBe(key);
    expect(property(key)['@Common.ValueListWithFixedValues'] ?? false).toBe(fixed);
  });

  it('lists ranks in the value help by seniority', () => {
    const valueList = property('rank_code')['@Common.ValueList'] as ValueList;
    const qualifier = valueList.PresentationVariantQualifier;
    expect(qualifier).toBeTruthy();
    const variant = annotations['GalacticService.Ranks'][`@UI.PresentationVariant#${qualifier}`];
    expect(variant).toEqual({ SortOrder: [{ Property: 'level' }] });
  });

  it('lists stardust statuses in the dropdown by level (Low, Growing, Stellar)', () => {
    const valueList = property('stardustStatus')['@Common.ValueList'] as ValueList;
    expect(valueList.Parameters[0].ValueListProperty).toBe('code');
    const qualifier = valueList.PresentationVariantQualifier;
    expect(qualifier).toBeTruthy();
    const variant =
      annotations['GalacticService.StardustStatuses'][`@UI.PresentationVariant#${qualifier}`];
    expect(variant).toEqual({ SortOrder: [{ Property: 'level' }] });
  });

  it.each([
    ['name', 'Name'],
    ['originPlanet_code', 'Origin Planet'],
    ['spacesuitColor', 'Spacesuit Color'],
    ['stardustCollected', 'Stardust Collected'],
    ['stardustStatus', 'Stardust Status'],
    ['wormholeNavSkill', 'Wormhole Navigation Skill'],
    ['rank_code', 'Rank'],
    ['department_ID', 'Department'],
    ['position_ID', 'Position'],
    ['email', 'Email'],
    ['stardustCriticality', 'Stardust Criticality'],
    ['avatarUrl', 'Avatar'],
  ])('labels %s as "%s"', (element, label) => {
    expect(property(element)['@Common.Label']).toBe(label);
  });

  describe('object page', () => {
    const facets = () => spacefarers()['@UI.Facets'] as Facet[];
    const dataPoint = (qualifier: string) => spacefarers()[`@UI.DataPoint#${qualifier}`];
    const missions = () => annotations['GalacticService.Missions'];
    const mission = (name: string) => annotations[`GalacticService.Missions/${name}`] ?? {};
    // the JSON flavour names record types by vocabulary URL, e.g. …/UI.xml#UI.ReferenceFacet
    const typeOf = (record: Facet) => record['@type'].split('#UI.')[1];

    it('titles the page with the name and describes it with the rank', () => {
      expect(spacefarers()['@UI.HeaderInfo']).toEqual({
        TypeName: 'Spacefarer',
        TypeNamePlural: 'Spacefarers',
        Title: expect.objectContaining({ Value: { $Path: 'name' } }),
        Description: { Value: { $Path: 'rank/name' } },
        ImageUrl: { $Path: 'avatarUrl' },
      });
    });

    it('shows the avatar only in the header, never as an editable field', () => {
      expect(property('avatarUrl')['@Core.Computed']).toBe(true);
      const fields = Object.entries(spacefarers())
        .filter(([term]) => term.startsWith('@UI.FieldGroup#'))
        .flatMap(([, group]) => (group as FieldGroup).Data.map((d) => d.Value.$Path));
      expect(fields).not.toContain('avatarUrl');
    });

    it('shows stardust status, wormhole skill and origin planet in the header', () => {
      const header = spacefarers()['@UI.HeaderFacets'] as Facet[];
      expect(header.map((f) => [typeOf(f), f.Label, f.Target])).toEqual([
        ['ReferenceFacet', undefined, '@UI.DataPoint#stardustStatus'],
        ['ReferenceFacet', undefined, '@UI.DataPoint#wormholeNavSkill'],
        ['ReferenceFacet', 'Origin Planet', '@UI.FieldGroup#OriginPlanet'],
      ]);
    });

    it('colours the stardust status in the header like in the list', () => {
      expect(dataPoint('stardustStatus')).toEqual({
        Value: { $Path: 'stardustStatus' },
        Title: 'Stardust Status',
        Criticality: { $Path: 'stardustCriticality' },
      });
    });

    it('rates the wormhole navigation skill out of 10 in the header', () => {
      expect(dataPoint('wormholeNavSkill')).toEqual({
        Value: { $Path: 'wormholeNavSkill' },
        Title: 'Wormhole Navigation Skill',
        Visualization: 'Rating',
        TargetValue: 10,
      });
    });

    it('shows the origin planet image and name in the header', () => {
      const group = spacefarers()['@UI.FieldGroup#OriginPlanet'] as {
        Data: { Value: { $Path: string }; Label?: string }[];
      };
      expect(group.Data.map((d) => [d.Value.$Path, d.Label])).toEqual([
        ['originPlanet/imageUrl', undefined],
        ['originPlanet_code', 'Name'],
      ]);
      expect(dataPoint('originPlanet')).toBeUndefined();
    });

    it('renders the planet image as an image labelled "Image"', () => {
      const imageUrl = annotations['GalacticService.Planets/imageUrl'];
      expect(imageUrl['@UI.IsImageURL']).toBe(true);
      expect(imageUrl['@Common.Label']).toBe('Image');
    });

    it('replaces the generated field group and facet', () => {
      expect(spacefarers()['@UI.FieldGroup#GeneratedGroup']).toBeUndefined();
      expect(facets().map((f) => f.ID)).not.toContain('GeneratedFacet1');
    });

    it('has the sections Profile, Cosmic Details, Assignment and Missions', () => {
      expect(facets().map((f) => [typeOf(f), f.ID, f.Label, f.Target])).toEqual([
        ['ReferenceFacet', 'Profile', 'Profile', '@UI.FieldGroup#Profile'],
        ['ReferenceFacet', 'CosmicDetails', 'Cosmic Details', '@UI.FieldGroup#CosmicDetails'],
        ['ReferenceFacet', 'Assignment', 'Assignment', '@UI.FieldGroup#Assignment'],
        ['ReferenceFacet', 'Missions', 'Missions', 'missions/@UI.PresentationVariant'],
      ]);
    });

    it.each([
      ['Profile', ['name', 'email', 'originPlanet_code']],
      [
        'CosmicDetails',
        ['stardustCollected', 'stardustStatus', 'wormholeNavSkill', 'spacesuitColor'],
      ],
      ['Assignment', ['rank_code', 'department_ID', 'position_ID']],
    ])('lists the %s fields in order', (qualifier, fields) => {
      const group = spacefarers()[`@UI.FieldGroup#${qualifier}`] as FieldGroup;
      expect(group.Data.map((d) => d.Value.$Path)).toEqual(fields);
    });

    it('colours the stardust status in the Cosmic Details section', () => {
      const group = spacefarers()['@UI.FieldGroup#CosmicDetails'] as FieldGroup;
      const status = group.Data.find((d) => d.Value.$Path === 'stardustStatus');
      expect(status?.Criticality).toEqual({ $Path: 'stardustCriticality' });
    });

    it('lists missions by title, status, start and end date, with the status coloured', () => {
      const lineItem = missions()['@UI.LineItem'] as FieldGroup['Data'];
      expect(lineItem.map((c) => c.Value.$Path)).toEqual([
        'title',
        'status',
        'startDate',
        'endDate',
      ]);
      const status = lineItem.find((c) => c.Value.$Path === 'status');
      expect(status?.Criticality).toEqual({ $Path: 'statusCriticality' });
    });

    it('lets the mission title take the spare width, so no filler column appears', () => {
      const lineItem = missions()['@UI.LineItem'] as {
        Value: { $Path: string };
        '@HTML5.CssDefaults'?: { width: string };
      }[];
      expect(lineItem.filter((c) => c['@HTML5.CssDefaults'])).toEqual([
        expect.objectContaining({
          Value: { $Path: 'title' },
          '@HTML5.CssDefaults': { width: 'auto' },
        }),
      ]);
    });

    it('sorts missions by start date', () => {
      expect(missions()['@UI.PresentationVariant']).toEqual({
        SortOrder: [{ Property: 'startDate' }],
        Visualizations: ['@UI.LineItem'],
      });
    });

    it('names missions from the i18n bundle', () => {
      expect(missions()['@UI.HeaderInfo']).toMatchObject({
        TypeName: 'Mission',
        TypeNamePlural: 'Missions',
      });
    });

    it('shows the mission status by name, picked from a fixed list', () => {
      expect(mission('status')['@Common.Text']).toEqual({ $Path: 'statusInfo/name' });
      expect(mission('status')['@Common.Text@UI.TextArrangement']).toBe('TextOnly');
      expect(mission('status')['@Common.ValueListWithFixedValues']).toBe(true);
      const valueList = mission('status')['@Common.ValueList'] as ValueList;
      expect(valueList.CollectionPath).toBe('MissionStatuses');
      expect(valueList.Parameters[0]).toMatchObject({
        LocalDataProperty: 'status',
        ValueListProperty: 'code',
      });
    });

    it('lists mission statuses in the dropdown by level (planned … failed)', () => {
      const valueList = mission('status')['@Common.ValueList'] as ValueList;
      const qualifier = valueList.PresentationVariantQualifier;
      expect(qualifier).toBe('ByLevel');
      const variant =
        annotations['GalacticService.MissionStatuses'][`@UI.PresentationVariant#${qualifier}`];
      expect(variant).toEqual({ SortOrder: [{ Property: 'level' }] });
    });

    // the status is calculated on the server, so FE must re-read it while the draft is edited
    it('refreshes the stardust status when stardust collected changes', () => {
      expect(spacefarers()['@Common.SideEffects#stardust']).toEqual({
        SourceProperties: ['stardustCollected'],
        TargetProperties: ['stardustStatus', 'stardustCriticality'],
      });
    });

    // otherwise the header keeps the old planet image after the planet is changed in a draft
    it('refreshes the header planet when the origin planet changes', () => {
      expect(spacefarers()['@Common.SideEffects#originPlanet']).toEqual({
        SourceProperties: ['originPlanet_code'],
        TargetEntities: ['originPlanet'],
      });
    });

    it('hides the technical mission fields', () => {
      expect(mission('ID')['@UI.Hidden']).toBe(true);
      expect(mission('spacefarer_ID')['@UI.Hidden']).toBe(true);
      expect(mission('statusCriticality')['@UI.Hidden']).toBe(true);
    });

    it.each([
      ['title', 'Title'],
      ['status', 'Status'],
      ['startDate', 'Start Date'],
      ['endDate', 'End Date'],
    ])('labels mission %s as "%s"', (element, label) => {
      expect(mission(element)['@Common.Label']).toBe(label);
    });
  });
});
