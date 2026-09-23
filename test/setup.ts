import { register } from 'tsx/cjs/api';

// CAP loads the service implementation with Node's require, outside Vitest's transform
process.env.CDS_TYPESCRIPT = 'tsx';
register();
