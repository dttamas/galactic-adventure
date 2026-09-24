sap.ui.define(
  [
    'sap/fe/test/JourneyRunner',
    'galactic/spacefarers/test/integration/pages/SpacefarersList.gen',
    'galactic/spacefarers/test/integration/pages/SpacefarersObjectPage.gen',
  ],
  function (JourneyRunner, SpacefarersListGenerated, SpacefarersObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
      launchUrl:
        sap.ui.require.toUrl('galactic/spacefarers') +
        '/test/flpSandbox.html#galacticspacefarers-tile',
      pages: {
        onTheSpacefarersListGenerated: SpacefarersListGenerated,
        onTheSpacefarersObjectPageGenerated: SpacefarersObjectPageGenerated,
      },
      async: true,
    });

    return runner;
  },
);
