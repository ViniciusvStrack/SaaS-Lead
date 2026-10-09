type LoginPageProps = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const state = await searchParams;
  return (
    <main>
      <h1>Entrar</h1>
      <p>Receba um link seguro de acesso no seu e-mail.</p>
      {state.sent === "1" && <p role="status">Se o e-mail estiver cadastrado, o link de acesso será enviado.</p>}
      {state.error && <p role="alert">Não foi possível concluir o acesso. Tente novamente.</p>}
      <form method="post" action="/api/auth/request-link">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <button type="submit">Enviar link de acesso</button>
      </form>
    </main>
  );
}
