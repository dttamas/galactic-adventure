import cds from '@sap/cds';

type Annotations = Record<string, Record<string, unknown>>;
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
  it('lets the text columns share the spare width', () => {
    const lineItem = spacefarers()['@UI.LineItem'] as {
      Value: { $Path: string };
      '@HTML5.CssDefaults'?: { width: string };
    }[];
    expect(
      lineItem.filter((c) => c['@HTML5.CssDefaults']).map((c) => c['@HTML5.CssDefaults']),
    ).toEqual(Array(4).fill({ width: 'auto' }));
    expect(lineItem.filter((c) => c['@HTML5.CssDefaults']).map((c) => c.Value.$Path)).toEqual([
      'name',
      'originPlanet_code',
      'spacesuitColor',
      'rank_code',
    ]);
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
    const group = spacefarers()['@UI.FieldGroup#GeneratedGroup'] as {
      Data: { Value: { $Path: string } }[];
    };
    expect(group.Data.map((d) => d.Value.$Path)).not.toContain('stardustCriticality');
    expect(group.Data).toHaveLength(8);
  });

  it('hides the technical spacefarer ID, but not the IDs of the value-help entities', () => {
    expect(property('ID')['@UI.Hidden']).toBe(true);
    expect(annotations['GalacticService.Departments/ID']['@UI.Hidden']).toBeUndefined();
    expect(annotations['GalacticService.Positions/ID']['@UI.Hidden']).toBeUndefined();
  });

  it('names the entity and the object page section from the i18n bundle', () => {
    expect(spacefarers()['@UI.HeaderInfo']).toMatchObject({
      TypeName: 'Spacefarer',
      TypeNamePlural: 'Spacefarers',
    });
    expect(spacefarers()['@UI.Facets']).toEqual([
      expect.objectContaining({ Label: 'General Information' }),
    ]);
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
  ])('labels %s as "%s"', (element, label) => {
    expect(property(element)['@Common.Label']).toBe(label);
  });
});
