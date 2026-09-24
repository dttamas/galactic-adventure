import cds from '@sap/cds';
import type { Spacefarer } from '#cds-models/GalacticService';

// undefined means the payload does not touch the planet
const planetIn = (data: Spacefarer): string | null | undefined => {
  if ('originPlanet_code' in data) return data.originPlanet_code;
  if ('originPlanet' in data) return data.originPlanet?.code ?? null;
  return undefined;
};

export function enforceOwnPlanet(req: cds.Request<Spacefarer>) {
  if (req.user.is('admin')) return;
  // XSUAA sends attributes as arrays
  const own: string[] = [req.user.attr.planet ?? []].flat();
  if (!own.length) return req.reject(403, 'No planet assigned to user');
  const planet = planetIn(req.data);
  if (planet === undefined) {
    if (req.event !== 'UPDATE') req.data.originPlanet_code = own[0];
    return;
  }
  if (planet === null || !own.includes(planet))
    req.reject(403, `Spacefarers must stay on Planet ${own}`);
}
