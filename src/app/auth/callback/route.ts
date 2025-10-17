import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get('redirectTo') || '/app';

  // Si el usuario llega con el token de OTP en la URL, Supabase lo procesa con getSession desde el navegador.
  // Aquí solo redirigimos a la ruta objetivo; el guard del server verificará membership.
  return NextResponse.redirect(new URL(redirectTo, req.url));
}
