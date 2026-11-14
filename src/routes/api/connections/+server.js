import { json } from '@sveltejs/kit';
import { loadConnections } from '$lib/server/load-connections';
export async function GET(event) { return json(await loadConnections(event)); }
