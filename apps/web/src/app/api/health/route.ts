function okResponse() {
	return new Response(null, { status: 204 });
}

export function GET() {
	return okResponse();
}

export function HEAD() {
	return okResponse();
}
